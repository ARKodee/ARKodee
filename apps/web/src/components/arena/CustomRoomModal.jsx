import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, Users, LogOut, ArrowLeft, ShieldAlert, X } from 'lucide-react';

export function CustomRoomModal({ socket, user, onClose }) {
  const navigate = useNavigate();

  // Internal state machine: 'CHOOSE' | 'CREATE' | 'JOIN'
  const [viewMode, setViewMode] = useState('CHOOSE');

  // Room lifecycle state — fully owned by this modal
  const [roomCode, setRoomCode] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Single unified effect: register listeners FIRST, then emit if needed.
  useEffect(() => {
    if (!socket) return;

    const onRoomUpdated = (updatedRoom) => {
      console.log('[CustomRoomModal] room_updated received:', updatedRoom.id, 'players:', updatedRoom.players.length, updatedRoom.players.map(p => p.username));
      setRoomData(updatedRoom);
      setRoomCode(updatedRoom.id);
      setIsLoading(false);
      setErrorMsg('');
    };

    const onRoomDissolved = () => {
      alert('The lobby has been dissolved by the host.');
      setRoomData(null);
      setRoomCode('');
      setJoinCode('');
      setErrorMsg('');
      setIsLoading(false);
      setCopied(false);
      setViewMode('CHOOSE');
      onClose();
    };

    const onOpponentLeft = () => {
      setRoomData((prev) => {
        if (!prev) return null;
        const hostOnly = prev.players.filter((p) => p.userId === prev.hostId);
        return { ...prev, players: hostOnly };
      });
    };

    const onRoomError = (msg) => {
      setErrorMsg(msg);
      setIsLoading(false);
    };

    const onMatchStarted = (data) => {
      console.log('[CustomRoomModal] match_started received, redirecting to arena:', data?.roomCode);
      const targetMatchId = data?.roomCode || 'CUSTOM-MATCH';
      onClose();
      navigate(`/arena/${targetMatchId}`);
    };

    // Step 1: Attach listeners before any emit
    socket.on('room_updated', onRoomUpdated);
    socket.on('room_dissolved', onRoomDissolved);
    socket.on('opponent_left_lobby', onOpponentLeft);
    socket.on('room_error', onRoomError);
    socket.on('match_started', onMatchStarted);

    // Step 2: Emit create_custom_room if we just entered CREATE mode
    if (viewMode === 'CREATE' && user && !roomCode) {
      setErrorMsg('');
      const activeUserId = user?.id || user?.userId || 'user-1';
      const activeUsername = user?.username || user?.name || user?.email?.split('@')[0] || 'Player';
      socket.emit('create_custom_room', {
        userId: activeUserId,
        username: activeUsername
      });
    }

    return () => {
      socket.off('room_updated', onRoomUpdated);
      socket.off('room_dissolved', onRoomDissolved);
      socket.off('opponent_left_lobby', onOpponentLeft);
      socket.off('room_error', onRoomError);
      socket.off('match_started', onMatchStarted);
    };
  }, [socket, viewMode, user, onClose, navigate]);

  const activeUserId = user?.id || user?.userId || 'user-1';
  const activeUsername = user?.username || user?.name || user?.email?.split('@')[0] || 'Player';
  const isHostUser = viewMode === 'CREATE';

  // Derived player state
  const hostPlayer = roomData?.players?.[0] || { username: activeUsername };
  const challengerPlayer = roomData?.players?.length >= 2 ? roomData.players[1] : null;

  // Handlers
  const resetAndClose = () => {
    setRoomData(null);
    setRoomCode('');
    setJoinCode('');
    setErrorMsg('');
    setIsLoading(false);
    setCopied(false);
    setViewMode('CHOOSE');
    onClose();
  };

  const handleLeave = () => {
    if (socket && roomCode && user) {
      socket.emit('leave_custom_room', {
        roomCode,
        userId: activeUserId,
        username: activeUsername,
      });
    }
    setRoomData(null);
    setRoomCode('');
    setJoinCode('');
    setErrorMsg('');
    setViewMode('CHOOSE');
  };

  const handleJoinSubmit = () => {
    if (!joinCode || joinCode.length !== 5) {
      setErrorMsg('Please enter a valid 5-character lobby code.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    if (socket) {
      socket.emit('join_custom_room', {
        roomCode: joinCode.toUpperCase(),
        userId: activeUserId,
        username: activeUsername,
      });
    }
  };

  const handleStartMatch = () => {
    if (!roomData || roomData.players.length < 2) return;
    const matchIdToUse = roomCode || 'ROOM-1V1';
    setIsLoading(true);
    if (socket) {
      socket.emit('request_start_match', {
        roomId: matchIdToUse,
        roomCode: matchIdToUse,
        userId: activeUserId,
        username: activeUsername,
      });
      socket.emit('start_custom_match', {
        roomId: matchIdToUse,
        roomCode: matchIdToUse,
        userId: activeUserId,
        username: activeUsername,
      });
    }
  };

  const handleCopy = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Shared leave button renderer
  const LeaveButton = ({ icon: Icon = LogOut }) => (
    <button
      onClick={handleLeave}
      className="text-zinc-400 hover:text-rose-400 text-sm px-4 py-2 border border-zinc-800 rounded-md transition-colors bg-zinc-900/40 hover:bg-rose-950/20 flex items-center gap-2 cursor-pointer"
    >
      <Icon size={12} />
      <span>Leave Room Lobby</span>
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg max-w-xl w-full mx-4 shadow-xl relative">

        {/* Close button — only when not in an active room */}
        {!roomData && (
          <button
            onClick={resetAndClose}
            className="absolute top-4 right-4 p-1.5 rounded-md border border-zinc-800 bg-zinc-950/40 text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        )}

        {/* ─── CHOOSE Screen ─── */}
        {viewMode === 'CHOOSE' && (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="max-w-md w-full flex flex-col gap-5">
              <div>
                <h2 className="text-base font-bold uppercase tracking-wider text-white">
                  Custom Lobby Setup
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Host a session or connect to a friend&apos;s active arena lobby code
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setViewMode('CREATE')}
                  className="flex flex-col items-center justify-center p-6 border border-zinc-800 rounded-md bg-zinc-950/40 hover:border-indigo-500/40 transition-colors cursor-pointer"
                >
                  <Swords size={20} className="text-indigo-400 mb-2" />
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">
                    Create Lobby
                  </span>
                </button>

                <button
                  onClick={() => setViewMode('JOIN')}
                  className="flex flex-col items-center justify-center p-6 border border-zinc-800 rounded-md bg-zinc-950/40 hover:border-emerald-500/40 transition-colors cursor-pointer"
                >
                  <Users size={20} className="text-emerald-400 mb-2" />
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">
                    Join Lobby
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── CREATE Screen ─── */}
        {viewMode === 'CREATE' && (
          <div className="flex flex-col gap-5">
            {/* Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-indigo-400">
                <Swords size={16} />
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold">
                  Lobby Host Status
                </span>
              </div>
              <LeaveButton icon={LogOut} />
            </div>

            {/* Room Code Monospace Box */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
                Lobby Entry Code
              </span>
              <div className="font-mono tracking-wider text-xl text-indigo-400 bg-zinc-900 border border-zinc-800 rounded-md p-4 flex items-center justify-between">
                <span className="select-all">{roomCode || 'CREATING LOBBY...'}</span>
                <button
                  onClick={handleCopy}
                  className={`text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1.5 border rounded-md transition-all cursor-pointer ${
                    copied
                      ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-400'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  {copied ? 'COPIED' : 'COPY'}
                </button>
              </div>
            </div>

            {/* Two-Slot Battle Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Slot 1: Host */}
              <div className="border border-zinc-800 bg-zinc-950/30 rounded-md p-4 flex flex-col items-center justify-center text-center relative min-h-[100px]">
                <div className="absolute top-0 left-0 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono text-[8px] uppercase font-bold px-2 py-0.5 rounded-br-md tracking-widest">
                  HOST
                </div>
                <div className="w-10 h-10 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-400 font-mono font-bold mb-2 text-sm">
                  {hostPlayer.username?.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-white">
                  {hostPlayer.username && hostPlayer.username !== 'Host' ? hostPlayer.username : activeUsername}
                </span>
                <span className="text-[8px] font-mono text-zinc-500 mt-0.5 uppercase">
                  // Stable
                </span>
              </div>

              {/* Slot 2: Challenger — conditional */}
              {challengerPlayer ? (
                <div className="border border-zinc-800 bg-zinc-950/30 rounded-md p-4 flex flex-col items-center justify-center text-center relative min-h-[100px]">
                  <div className="absolute top-0 left-0 bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-[8px] uppercase font-bold px-2 py-0.5 rounded-br-md tracking-widest">
                    GUEST
                  </div>
                  <div className="w-10 h-10 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 font-mono font-bold mb-2 text-sm">
                    {challengerPlayer.username?.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-white">
                    {challengerPlayer.username}
                  </span>
                  <span className="text-[8px] font-mono text-emerald-400 mt-0.5 uppercase">
                    // Connected
                  </span>
                </div>
              ) : (
                <div className="border border-dashed border-zinc-800 bg-zinc-900/20 p-4 rounded-md text-zinc-500 text-center animate-pulse flex items-center justify-center min-h-[100px]">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-600">
                    Awaiting Match Connection...
                  </span>
                </div>
              )}
            </div>

            {/* Start Match CTA */}
            {isHostUser ? (
              <button
                disabled={!challengerPlayer || isLoading}
                onClick={handleStartMatch}
                className="w-full py-3 px-6 font-semibold tracking-wide rounded-md transition-all duration-200 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zinc-800 text-white text-xs uppercase cursor-pointer"
              >
                {isLoading ? 'Starting Match...' : 'Start Match'}
              </button>
            ) : (
              <div className="w-full py-3 px-6 bg-zinc-950 border border-zinc-800 text-zinc-500 font-mono text-xs uppercase text-center rounded-md cursor-not-allowed font-mono">
                🔒 Waiting for Host to Start Match...
              </div>
            )}
          </div>
        )}

        {/* ─── JOIN Screen ─── */}
        {viewMode === 'JOIN' && (
          <div className="flex flex-col gap-5">
            {/* Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-emerald-400">
                <Users size={16} />
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold">
                  Challenger Portal
                </span>
              </div>
              <LeaveButton icon={ArrowLeft} />
            </div>

            {roomData ? (
              /* Connected State */
              <div className="flex flex-col gap-4">
                <div className="bg-emerald-950/20 border border-emerald-900/40 p-4 rounded-md">
                  <p className="text-xs font-bold text-white">Lobby Connection Stable</p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    ROOM ID: {roomCode}
                  </p>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 py-3 rounded-md text-center">
                  <span className="text-[10px] font-mono text-indigo-400 animate-pulse tracking-widest">
                    Connected! Waiting for host to initialize match execution loop...
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 border border-zinc-800 bg-zinc-950/30 p-4 rounded-md">
                  <div>
                    <span className="text-[9px] font-mono text-zinc-500 uppercase block tracking-wider">
                      Host
                    </span>
                    <span className="text-xs font-bold text-zinc-300">
                      {hostPlayer.username}
                    </span>
                  </div>
                  <div className="border-l border-zinc-800 pl-4">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase block tracking-wider">
                      You (Challenger)
                    </span>
                    <span className="text-xs font-bold text-indigo-400">
                      {user?.username}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Input State */
              <div className="flex flex-col gap-4 max-w-sm mx-auto w-full py-2">
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">
                    Lobby Code
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ABCDE"
                    className="focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-zinc-950 border border-zinc-800 rounded-md text-center tracking-widest text-lg p-3 font-mono text-white uppercase outline-none transition-all"
                  />
                </div>

                {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3 flex items-center gap-2 text-xs font-mono text-red-400">
                    <ShieldAlert size={14} className="flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  onClick={handleJoinSubmit}
                  disabled={isLoading || joinCode.length !== 5}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs uppercase tracking-wider rounded-md transition-all cursor-pointer"
                >
                  {isLoading ? 'Connecting...' : 'Connect Room'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
