import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { getProblemsList } from '../../lib/problems';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';

const DIFFICULTY_VARIANT = {
  EASY:   'success',
  MEDIUM: 'warning',
  HARD:   'danger',
};

export function ProblemOverviewCard() {
  const { isSuperadmin } = useAuth();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => {
    let alive = true;
    getProblemsList()
      .then((res) => {
        if (!alive) return;
        const list = Array.isArray(res) ? res : (res?.results ?? res?.problems ?? []);
        setProblems(list.slice(0, 8));
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
        <span className="mod-card__title">Problem Bank</span>
        <Link to={isSuperadmin ? '/admin/problems' : '/moderator/problems'} className="mod-card__cta">Manage →</Link>
      </div>

      {loading && (
        <div className="mod-card__list">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="mod-card__row mod-card__row--loading">
              <Skeleton variant="text" width="55%" />
              <Skeleton variant="text" width="60px" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <EmptyState title="Failed to load" description="Could not fetch problems." />
      )}

      {!loading && !error && problems.length === 0 && (
        <EmptyState
          title="No problems yet"
          description="Head to the Problem Bank to create your first DSA problem."
        />
      )}

      {!loading && !error && problems.length > 0 && (
        <div className="mod-card__list">
          {problems.map((p) => (
            <div key={p.id ?? p.slug} className="mod-card__row">
              <span className="mod-card__row-title">{p.title}</span>
              <Badge variant={DIFFICULTY_VARIANT[p.difficulty] ?? 'default'}>
                {p.difficulty}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
