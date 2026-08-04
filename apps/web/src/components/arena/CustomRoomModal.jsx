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
      const activeUsername = user?.firstName || user?.username || user?.name || user?.email?.split('@')[0] || 'Player';
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
  const activeUsername = user?.firstName || user?.username || user?.name || user?.email?.split('@')[0] || 'Player';
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
    <div className="crm-overlay">
      <div className="crm-modal">

        {/* Close button — only when not in an active room */}
        {!roomData && (
          <button
            onClick={resetAndClose}
            className="crm-close-btn"
          >
            <X size={14} />
          </button>
        )}

        {/* ─── CHOOSE Screen ─── */}
        {viewMode === 'CHOOSE' && (
          <div className="crm-choose-view">
            <div className="crm-choose-view-container">
              <div>
                <h2 className="crm-title">
                  Custom Lobby Setup
                </h2>
                <p className="crm-subtitle">
                  Host a session or connect to a friend&apos;s active arena lobby code
                </p>
              </div>

              <div className="crm-btn-grid">
                <button
                  onClick={() => setViewMode('CREATE')}
                  className="crm-choose-btn"
                >
                  <Swords size={20} className="text-indigo-400" />
                  <span className="crm-choose-btn-label">
                    Create Lobby
                  </span>
                </button>

                <button
                  onClick={() => setViewMode('JOIN')}
                  className="crm-choose-btn"
                >
                  <Users size={20} className="text-emerald-400" />
                  <span className="crm-choose-btn-label">
                    Join Lobby
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── CREATE Screen ─── */}
        {viewMode === 'CREATE' && (
          <div className="crm-create-view">
            {/* Header Bar */}
            <div className="crm-header-bar">
              <div className="crm-lobby-status crm-lobby-status--host">
                <Swords size={16} />
                <span className="crm-lobby-status-label">
                  Lobby Host Status
                </span>
              </div>
              <LeaveButton icon={LogOut} />
            </div>

            {/* Room Code Monospace Box */}
            <div className="crm-code-section">
              <span className="crm-code-label">
                Lobby Entry Code
              </span>
              <div className="crm-code-box">
                <span className="select-all">{roomCode || 'CREATING LOBBY...'}</span>
                <button
                  onClick={handleCopy}
                  className={`crm-copy-btn ${copied ? 'crm-copy-btn--copied' : ''}`}
                >
                  {copied ? 'COPIED' : 'COPY'}
                </button>
              </div>
            </div>

            {/* Two-Slot Battle Grid */}
            <div className="crm-battle-grid">
              {/* Slot 1: Host */}
              <div className="crm-slot">
                <div className="crm-slot-badge crm-slot-badge--host">
                  HOST
                </div>
                <div className="crm-slot-avatar crm-slot-avatar--host">
                  {hostPlayer.username?.substring(0, 2).toUpperCase()}
                </div>
                <span className="crm-slot-name">
                  {hostPlayer.username && hostPlayer.username !== 'Host' ? hostPlayer.username : activeUsername}
                </span>
                <span className="crm-slot-status crm-slot-status--host">
                  Stable
                </span>
              </div>

              {/* Slot 2: Challenger — conditional */}
              {challengerPlayer ? (
                <div className="crm-slot">
                  <div className="crm-slot-badge crm-slot-badge--guest">
                    GUEST
                  </div>
                  <div className="crm-slot-avatar crm-slot-avatar--guest">
                    {challengerPlayer.username?.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="crm-slot-name">
                    {challengerPlayer.username}
                  </span>
                  <span className="crm-slot-status crm-slot-status--guest">
                    Connected
                  </span>
                </div>
              ) : (
                <div className="crm-slot crm-slot--empty">
                  <span className="crm-slot-empty-text">
                    Awaiting Challenger...
                  </span>
                </div>
              )}
            </div>

            {/* Start Match CTA */}
            {isHostUser ? (
              <button
                disabled={!challengerPlayer || isLoading}
                onClick={handleStartMatch}
                className="crm-lobby-start-btn"
              >
                {isLoading ? 'Starting Match...' : 'Start Match'}
              </button>
            ) : (
              <div className="crm-lobby-waiting-status">
                🔒 Waiting for Host to Start Match...
              </div>
            )}
          </div>
        )}

        {/* ─── JOIN Screen ─── */}
        {viewMode === 'JOIN' && (
          <div className="crm-join-view">
            {/* Header Bar */}
            <div className="crm-header-bar">
              <div className="crm-lobby-status crm-lobby-status--guest">
                <Users size={16} />
                <span className="crm-lobby-status-label">
                  Challenger Portal
                </span>
              </div>
              <LeaveButton icon={ArrowLeft} />
            </div>

            {roomData ? (
              /* Connected State */
              <div className="crm-join-input-section">
                <div className="crm-connect-success-box">
                  <p className="crm-connect-success-title">Lobby Connection Stable</p>
                  <p className="crm-connect-success-subtitle">
                    ROOM ID: {roomCode}
                  </p>
                </div>

                <div className="crm-connect-waiting-box">
                  <span className="crm-connect-waiting-text">
                    Connected! Waiting for host to start match...
                  </span>
                </div>

                <div className="crm-connect-players-box">
                  <div>
                    <span className="crm-connect-player-label">
                      Host
                    </span>
                    <span className="crm-connect-player-name">
                      {hostPlayer.username}
                    </span>
                  </div>
                  <div className="crm-connect-players-sep">
                    <span className="crm-connect-player-label">
                      You (Challenger)
                    </span>
                    <span className="crm-connect-player-name crm-connect-player-name--me">
                      {user?.username}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Input State */
              <div className="crm-join-input-section">
                <div className="crm-join-field-wrapper">
                  <label className="crm-join-field-label">
                    Lobby Code
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ABCDE"
                    className="crm-input-field"
                  />
                </div>

                {errorMsg && (
                  <div className="crm-error-box">
                    <ShieldAlert size={14} className="crm-error-icon" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  onClick={handleJoinSubmit}
                  disabled={isLoading || joinCode.length !== 5}
                  className="crm-join-submit-btn"
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
