// src/components/moderator/ModStatCard.jsx
// A stat summary tile for the moderator dashboard.
import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export function ModStatCard({ label, value, icon, variant = 'accent', trend, trendDir = 'flat', loading = false }) {
  return (
    <div className="mod-stat">
      <div className="mod-stat__top">
        <span className={`mod-stat__icon mod-stat__icon--${variant}`}>{icon}</span>
        {trend && (
          <span className={`mod-stat__trend mod-stat__trend--${trendDir}`}>{trend}</span>
        )}
      </div>
      {loading
        ? <Skeleton width="60px" height="var(--text-xl)" />
        : <span className="mod-stat__value">{value ?? '—'}</span>
      }
      <span className="mod-stat__label">{label}</span>
    </div>
  );
}
