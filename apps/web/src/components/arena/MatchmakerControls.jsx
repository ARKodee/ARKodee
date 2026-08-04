import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Users, Swords } from 'lucide-react';

export function MatchmakerControls({ onOpenCustomModal }) {
  const navigate = useNavigate();
  const [isSearching, setIsSearching] = useState(false);
  const [searchElapsed, setSearchElapsed] = useState(0);
  const [matchFound, setMatchFound] = useState(false);

  // Queue elapsed timer — owned locally since search state is component-scoped
  useEffect(() => {
    let timer;
    if (isSearching) {
      timer = setInterval(() => {
        setSearchElapsed((prev) => {
          const nextVal = prev + 1;
          if (nextVal >= 3) {
            setMatchFound(true);
          }
          return nextVal;
        });
      }, 1000);
    } else {
      setSearchElapsed(0);
      setMatchFound(false);
    }
    return () => clearInterval(timer);
  }, [isSearching]);

  const formatSearchTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStartPublicMatch = () => {
    navigate('/arena/ranked-1v1');
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
                isSearching
                  ? `animate-pulse ${matchFound ? 'text-emerald-400' : 'text-red-400'}`
                  : 'text-indigo-400'
              }
            />
            <span className="mac-section-label">
              Public Queue
            </span>
          </div>

          {isSearching ? (
            matchFound ? (
              <div className="mac-queue-box mac-queue-box--success">
                <div className="mac-queue-status">
                  <span className="mac-queue-status-ping mac-queue-status-ping--success"></span>
                  <span className="mac-queue-status-text mac-queue-status-text--success">
                    Match Identified!
                  </span>
                </div>
                <span className="mac-queue-timer">
                  Arena Ready
                </span>
                <div className="mac-queue-actions">
                  <button
                    onClick={handleStartPublicMatch}
                    className="mac-btn-primary"
                  >
                    <Swords size={12} />
                    <span>Enter Match Arena</span>
                  </button>
                  <button
                    onClick={() => setIsSearching(false)}
                    className="mac-btn-danger"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ) : (
              <div className="mac-queue-box">
                <div className="mac-queue-status">
                  <span className="mac-queue-status-ping"></span>
                  <span className="mac-queue-status-text">
                    Searching for opponent...
                  </span>
                </div>
                <span className="mac-queue-timer">
                  [{formatSearchTime(searchElapsed)}]
                </span>
                <div className="mac-queue-actions">
                  <button
                    onClick={() => setIsSearching(false)}
                    className="mac-btn-danger w-full"
                  >
                    Cancel Queue
                  </button>
                </div>
              </div>
            )
          ) : (
            <button
              onClick={() => setIsSearching(true)}
              className="mac-btn-large"
            >
              <Zap size={14} />
              <span>Find & Start 1v1 Match</span>
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="mac-divider"></div>

        {/* Section 2: Custom Private Lobby */}
        <div className="mac-section">
          <div className="mac-section-header">
            <Users size={14} className="text-purple-400" />
            <span className="mac-section-label">
              Private Lobby
            </span>
          </div>

          <button
            onClick={onOpenCustomModal}
            className="mac-btn-large-outline"
          >
            Configure Private Custom Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
