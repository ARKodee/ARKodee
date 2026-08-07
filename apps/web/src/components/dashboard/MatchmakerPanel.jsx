// src/components/dashboard/MatchmakerPanel.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import './dashboard-widgets.css';

export function MatchmakerPanel() {
  const navigate = useNavigate();

  const handleStartMatchmaking = () => {
    navigate('/matchmaking?autoQueue=true');
  };

  return (
    <div className="widget">
      <div className="widget__header">
        <span className="widget__title">1v1 Combat Matchmaking</span>
      </div>

      <div className="widget__body">
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)', lineHeight: '1.4' }}>
          Instantly search for an active opponent near your ELO ranking and battle in real-time.
        </p>
        <Button
          id="launch-matchmaking-btn"
          variant="primary"
          style={{ width: '100%' }}
          onClick={handleStartMatchmaking}
        >
          ⚔️ Find Match — 1v1 Ranked
        </Button>
      </div>
    </div>
  );
}