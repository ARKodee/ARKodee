// src/components/dashboard/DailyBugCard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDailyBug } from '../../lib/bugs';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import './dashboard-widgets.css';

export function DailyBugCard() {
  const navigate = useNavigate();
  const [bugData, setBugData]   = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    let alive = true;
    getDailyBug()
      .then((d) => alive && (setBugData(d), setIsLoading(false)))
      .catch((e) => alive && (setError(e.message), setIsLoading(false)));
    return () => { alive = false; };
  }, []);

  if (isLoading) {
    return (
      <div className="widget">
        <div className="widget__header"><Skeleton variant="text" width="40%" /></div>
        <div className="widget__body" style={{ gap: 'var(--space-2)' }}>
          <Skeleton variant="title" />
          <Skeleton variant="text" />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="card" height="60px" />
          <Skeleton variant="btn" width="100%" />
        </div>
      </div>
    );
  }

  if (error || !bugData) {
    return (
      <div className="widget">
        <div className="widget__body">
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            {error || 'No active bug bounty today.'}
          </p>
        </div>
      </div>
    );
  }

  const { bug_id, title, category, date, description, sample_input, expected_output, streak, xp_reward, is_solved } = bugData;

  return (
    <div className="widget">
      {/* Body */}
      <div className="widget__body">
        {/* Meta */}
        <div className="bug-card__meta">
          {category && <Badge variant="warning">{category}</Badge>}
          {date && <span style={{ fontSize: 'var(--text-nano)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>{date}</span>}
        </div>

        {/* Title + desc */}
        <div>
          <p className="bug-card__title">{title}</p>
          {description && <p className="bug-card__desc" style={{ marginTop: 'var(--space-1)' }}>{description}</p>}
        </div>

        {/* I/O preview */}
        {(sample_input || expected_output) && (
          <div className="bug-card__io">
            {sample_input && (
              <div className="bug-card__io-row">
                <span className="bug-card__io-label">Input</span>
                <code className="bug-card__io-value">{sample_input}</code>
              </div>
            )}
            {expected_output && (
              <div className="bug-card__io-row">
                <span className="bug-card__io-label">Expected</span>
                <code className="bug-card__io-value bug-card__io-value--success">{expected_output}</code>
              </div>
            )}
          </div>
        )}

        {/* Rewards */}
        <div className="bug-card__rewards">
          {streak    !== undefined && <Badge variant="warning">🔥 {streak}d streak</Badge>}
          {xp_reward !== undefined && <Badge variant="accent">+{xp_reward} XP</Badge>}
        </div>

        {/* CTA */}
        {is_solved ? (
          <div className="bug-card__solved">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Solved
          </div>
        ) : (
          <Button variant="primary" style={{ width: '100%' }} onClick={() => bug_id && navigate(`/debug/${bug_id}`)}>
            Squash Bug →
          </Button>
        )}
      </div>
    </div>
  );
}

export default DailyBugCard;
