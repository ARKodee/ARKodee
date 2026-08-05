import React from 'react';
import { Trophy, Loader2 } from 'lucide-react';

export function PastMatchesList({ matches, loading = false }) {

  return (
    <div className="pml-container">
      {/* Panel Header */}
      <div className="pml-header">
        <Trophy size={15} />
        <h2 className="pml-title">Combat Records</h2>
        {loading && <Loader2 size={13} className="pml-loading-icon" />}
      </div>

      {/* Match Row List */}
      <div className="pml-list">
        {loading ? (
          // Loading skeletons
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="pml-row pml-row--skeleton">
              <div className="pml-skeleton-left">
                <div className="pml-skeleton-line pml-skeleton-line--wide" />
                <div className="pml-skeleton-line pml-skeleton-line--short" />
              </div>
              <div className="pml-skeleton-right">
                <div className="pml-skeleton-pill" />
                <div className="pml-skeleton-line pml-skeleton-line--med" />
              </div>
            </div>
          ))
        ) : matches.length === 0 ? (
          <div className="pml-empty">
            <Trophy size={28} className="pml-empty-icon" />
            <p className="pml-empty-title">No matches yet</p>
            <p className="pml-empty-sub">Find a 1v1 match to start your record</p>
          </div>
        ) : (
          matches.map((match) => {
            const isVictory = match.result === 'Victory';
            const isDraw = match.result === 'Draw';

            return (
              <div key={match.id} className="pml-row">
                {/* Left: Opponent + Date */}
                <div className="pml-info">
                  <span className="pml-mode">
                    vs {match.opponent_name || 'Contender'}
                  </span>
                  <span className="pml-date">{match.date}</span>
                </div>

                {/* Right: Status Badge + ELO Delta */}
                <div className="pml-status">
                  {isDraw ? (
                    <span className="pml-badge pml-badge--draw">DRAW</span>
                  ) : isVictory ? (
                    <span className="pml-badge pml-badge--victory">VICTORY</span>
                  ) : (
                    <span className="pml-badge pml-badge--defeat">DEFEAT</span>
                  )}
                  <span
                    className={`pml-elo-delta ${
                      isDraw
                        ? 'pml-elo-delta--draw'
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
          })
        )}
      </div>

      {/* Footer */}
      {!loading && matches.length > 0 && (
        <div className="pml-footer">
          <p className="pml-footer-text">
            Recent match history · Rating updates after each duel.
          </p>
        </div>
      )}
    </div>
  );
}
