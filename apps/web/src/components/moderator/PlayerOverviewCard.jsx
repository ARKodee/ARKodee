import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { getGlobalLeaderboard } from '../../lib/contests';
import { Avatar } from '../ui/Avatar';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';

export function PlayerOverviewCard() {
  const { isSuperadmin } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    let alive = true;
    getGlobalLeaderboard()
      .then((res) => {
        if (!alive) return;
        const list = Array.isArray(res) ? res : (res?.results ?? res?.leaderboard ?? []);

        // ✅ Exclude staff and superusers — moderator sees only competitor players
        const competitorsOnly = list.filter(
          (p) => !p.is_staff && !p.is_superuser
        );

        setPlayers(competitorsOnly.slice(0, 8));
        setLoading(false);
      })
      .catch(() => {
        if (alive) { setError(true); setLoading(false); }
      });
    return () => { alive = false; };
  }, []);

  return (
    <div className="mod-card">
      <div className="mod-card__header">
        <span className="mod-card__title">Top Players</span>
        <Link to={isSuperadmin ? '/admin/players' : '/moderator/players'} className="mod-card__cta">Manage →</Link>
      </div>

      {loading && (
        <div className="mod-card__list">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="mod-player__row mod-player__row--loading">
              <Skeleton variant="text" width="24px" />
              <Skeleton variant="circle" width="28px" height="28px" />
              <Skeleton variant="text" width="100px" />
              <Skeleton variant="text" width="50px" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <EmptyState title="Unavailable" description="Could not load leaderboard." />
      )}

      {!loading && !error && players.length === 0 && (
        <EmptyState title="No players yet" description="No competitor rankings available." />
      )}

      {!loading && !error && players.length > 0 && (
        <div className="mod-card__list">
          {players.map((p, i) => (
            <div key={p.username ?? i} className="mod-player__row">
              <span className="mod-player__rank">#{i + 1}</span>
              <Avatar name={p.username ?? p.full_name ?? 'User'} size="sm" />
              <span className="mod-player__name">{p.username ?? p.full_name ?? 'Unknown'}</span>
              <span className="mod-player__elo">{p.contest_rating ?? p.elo ?? '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
