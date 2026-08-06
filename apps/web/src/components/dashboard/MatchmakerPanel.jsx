// src/components/dashboard/MatchmakerPanel.jsx
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import './dashboard-widgets.css';

// No MODES array needed — only 1v1 Ranked exists

function fmtTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function MatchmakerPanel() {
  const [isSearching, setIsSearching]   = useState(false);
  const [elapsed, setElapsed]           = useState(0);

  useEffect(() => {
    if (!isSearching) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isSearching]);

  return (
    <div className="widget">
      <div className="widget__header">
        <span className="widget__title">Matchmaking</span>
        {isSearching && (
          <span className="matchmaker__search-status">
            <span className="matchmaker__ping-dot" />
            {fmtTime(elapsed)}
          </span>
        )}
      </div>

      <div className="widget__body">
        <Button
          id="launch-matchmaking-btn"
          variant={isSearching ? 'danger' : 'primary'}
          style={{ width: '100%' }}
          onClick={() => setIsSearching((s) => !s)}
        >
          {isSearching ? `Searching… ${fmtTime(elapsed)}` : 'Find Match — 1v1 Ranked'}
        </Button>

        {isSearching && (
          <span className="matchmaker__search-status">
            <span className="matchmaker__ping-dot" />
            Searching for an opponent
          </span>
        )}
      </div>
    </div>
  );
}