// src/components/dashboard/GlobalLeaderboard.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/AuthContext';
import { getGlobalLeaderboard } from '../../lib/contests';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import './dashboard-widgets.css';

export function GlobalLeaderboard() {
  const { user: authUser } = useAuth();
  const [players, setPlayers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    let alive = true;
    getGlobalLeaderboard()
      .then((data) => {
        if (!alive) return;
        // API returns array of { rank, username, contest_rating, delta, ... }
        const normalized = (Array.isArray(data) ? data : data?.results ?? []).map((p, i) => ({
          rank:  p.rank  ?? i + 1,
          name:  p.username ?? p.name ?? `Player ${i + 1}`,
          elo:   p.contest_rating ?? p.elo ?? 1200,
          delta: p.delta ?? p.rating_change ?? '—',
        }));
        setPlayers(normalized);
        setLoading(false);
      })
      .catch((e) => alive && (setError(e.message), setLoading(false)));
    return () => { alive = false; };
  }, []);

  const currentUsername = authUser?.username ?? authUser?.name ?? null;

  return (
    <div className="widget">
      {/* Header */}
      <div className="widget__header">
        <span className="widget__title">Leaderboard</span>
        <Badge variant="accent">Global</Badge>
      </div>

      {/* Column heads */}
      <div className="leaderboard__col-heads">
        <span>#</span>
        <span>Player</span>
        <span>ELO</span>
        <span style={{ textAlign: 'right' }}>Δ</span>
      </div>

      {/* Rows */}
      <div className="leaderboard__table">
        {loading && [1,2,3,4,5].map((i) => (
          <div key={i} className="leaderboard__row">
            <Skeleton width="16px" height="var(--text-xs)" />
            <Skeleton width="80%" height="var(--text-xs)" />
            <Skeleton width="40px" height="var(--text-xs)" />
            <Skeleton width="24px" height="var(--text-xs)" />
          </div>
        ))}

        {error && !loading && (
          <div style={{ padding: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>
            Could not load leaderboard.
          </div>
        )}

        {!loading && !error && players.length === 0 && (
          <div style={{ padding: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>
            No data yet.
          </div>
        )}

        {!loading && !error && players.map((p) => {
          const isSelf = currentUsername && p.name.toLowerCase() === currentUsername.toLowerCase();
          const deltaStr = typeof p.delta === 'number' ? (p.delta >= 0 ? `+${p.delta}` : `${p.delta}`) : String(p.delta);
          const deltaUp  = deltaStr.startsWith('+');
          return (
            <div
              key={p.name}
              className={`leaderboard__row${isSelf ? ' leaderboard__row--self' : ''}`}
              id={isSelf ? 'leaderboard-self-row' : undefined}
            >
              <span className={`leaderboard__rank${p.rank <= 3 ? ' leaderboard__rank--top' : ''}`}>
                {p.rank <= 3 ? ['①','②','③'][p.rank - 1] : p.rank}
              </span>
              <span className="leaderboard__name">
                {p.name}
                {isSelf && <span className="leaderboard__you">you</span>}
              </span>
              <span className="leaderboard__elo">{p.elo.toLocaleString()}</span>
              <span className={`leaderboard__delta leaderboard__delta--${deltaStr === '—' ? 'flat' : deltaUp ? 'up' : 'down'}`}>
                {deltaStr}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}