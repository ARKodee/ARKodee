import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { getContestsList } from '../../lib/contests';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';

const STATUS_VARIANT = {
  live:      'danger',
  LIVE:      'danger',
  upcoming:  'accent',
  UPCOMING:  'accent',
  scheduled: 'accent',
  SCHEDULED: 'accent',
  ended:     'default',
  ENDED:     'default',
  past:      'default',
};

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function ContestOverviewCard() {
  const { isSuperadmin } = useAuth();
  const [contests, setContests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => {
    let alive = true;

    // Fetch both live and upcoming contests, merge and sort.
    Promise.allSettled([
      getContestsList('live'),
      getContestsList('upcoming'),
    ]).then((results) => {
      if (!alive) return;
      const merged = results
        .flatMap((r) => (r.status === 'fulfilled' ? (Array.isArray(r.value) ? r.value : (r.value?.results ?? [])) : []))
        .slice(0, 6);
      setContests(merged);
      setLoading(false);
    });

    return () => { alive = false; };
  }, []);

  return (
    <div className="mod-card">
      <div className="mod-card__header">
        <span className="mod-card__title">Contests</span>
        <Link to={isSuperadmin ? '/admin/contests' : '/moderator/contests'} className="mod-card__cta">Manage →</Link>
      </div>

      {loading && (
        <div className="mod-card__list">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="mod-card__row mod-card__row--loading">
              <Skeleton variant="text" width="50%" />
              <Skeleton variant="text" width="70px" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <EmptyState title="Failed to load" description="Could not fetch contests." />
      )}

      {!loading && !error && contests.length === 0 && (
        <EmptyState
          title="No active contests"
          description="Schedule a new contest from the Contest Manager."
        />
      )}

      {!loading && !error && contests.length > 0 && (
        <div className="mod-card__list">
          {contests.map((c) => (
            <div key={c.id ?? c.slug} className="mod-card__row">
              <div className="mod-card__row-meta">
                <span className="mod-card__row-title">{c.title}</span>
                <span className="mod-card__row-sub">{formatDate(c.start_time)}</span>
              </div>
              <Badge variant={STATUS_VARIANT[c.status] ?? 'default'}>
                {c.status ?? 'Scheduled'}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
