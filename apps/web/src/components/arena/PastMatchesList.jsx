import React from 'react';
import { Trophy } from 'lucide-react';

export function PastMatchesList({ matches = [] }) {
  const matchRecords = matches.length > 0 ? matches : [
    { id: 1, opponent_name: 'Dharmil_07', result: 'Victory', elo_delta: '+18 ELO', date: '2026-07-09' },
    { id: 2, opponent_name: 'RecurseKing', result: 'Defeat', elo_delta: '-15 ELO', date: '2026-07-08' },
    { id: 3, opponent_name: 'Ptr_Syntax', result: 'Victory', elo_delta: '0 ELO (Unranked)', date: '2026-07-07' },
    { id: 4, opponent_name: 'AlgoKing_99', result: 'Victory', elo_delta: '+22 ELO', date: '2026-07-05' },
    { id: 5, opponent_name: 'Player_B', result: 'Victory', elo_delta: '+14 ELO', date: '2026-07-04' },
    { id: 6, opponent_name: 'Player_C', result: 'Defeat', elo_delta: '-11 ELO', date: '2026-07-02' }
  ];

  return (
    <div className="pml-container">
      {/* Panel Header */}
      <div className="pml-header">
        <Trophy size={15} />
        <h2 className="pml-title">
          Combat Records
        </h2>
      </div>

      {/* Match Row List */}
      <div className="pml-list">
        {matchRecords.map((match) => {
          const isVictory = match.result === 'Victory';
          const isUnranked = String(match.elo_delta || '').includes('0 ELO') || String(match.elo_delta || '').includes('Unranked');

          return (
            <div
              key={match.id}
              className="pml-row"
            >
              {/* Left: Opponent + Date */}
              <div className="pml-info">
                <span className="pml-mode">
                  vs {match.opponent_name || 'Contender'}
                </span>
                <span className="pml-date">
                  {match.date}
                </span>
              </div>

              {/* Right: Status Badge + ELO Delta */}
              <div className="pml-status">
                {isUnranked ? (
                  <span className="pml-badge pml-badge--unranked">
                    UNRANKED
                  </span>
                ) : isVictory ? (
                  <span className="pml-badge pml-badge--victory">
                    VICTORY
                  </span>
                ) : (
                  <span className="pml-badge pml-badge--defeat">
                    DEFEAT
                  </span>
                )}
                <span
                  className={`pml-elo-delta ${
                    isUnranked
                      ? 'pml-elo-delta--unranked'
                      : isVictory
                        ? 'pml-elo-delta--victory'
                        : 'pml-elo-delta--defeat'
                  }`}
                >
                  {match.elo_delta}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="pml-footer">
        <p className="pml-footer-text">
          Recent match history records. Rating adjustments are updated dynamically after each duel.
        </p>
      </div>
    </div>
  );
}
