// src/components/dashboard/MatchmakerPanel.jsx
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import './dashboard-widgets.css';

const MODES = ['1v1 Ranked', '2v2 Arena', 'Class Strike'];

function fmtTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function MatchmakerPanel() {
  const [selectedMode, setSelectedMode] = useState('1v1 Ranked');
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
        {/* Mode selector */}
        <div className="matchmaker__modes">
          {MODES.map((mode) => (
            <button
              key={mode}
              id={`mode-btn-${mode.replace(/\s+/g, '-').toLowerCase()}`}
              className={`matchmaker__mode-btn${selectedMode === mode ? ' matchmaker__mode-btn--active' : ''}`}
              onClick={() => !isSearching && setSelectedMode(mode)}
              disabled={isSearching}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Launch button */}
        <Button
          id="launch-matchmaking-btn"
          variant={isSearching ? 'danger' : 'primary'}
          style={{ width: '100%' }}
          onClick={() => setIsSearching((s) => !s)}
        >
          {isSearching ? `Cancel Search  ${fmtTime(elapsed)}` : `Find Match — ${selectedMode}`}
        </Button>

        {isSearching && (
          <p className="matchmaker__search-status" style={{ justifyContent: 'center', fontSize: 'var(--text-nano)' }}>
            Searching for {selectedMode} opponents…
          </p>
        )}
      </div>
    </div>
  );
}