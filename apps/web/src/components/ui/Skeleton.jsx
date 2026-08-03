// src/components/ui/Skeleton.jsx
import React from 'react';
import './ui.css';

/**
 * Skeleton loading placeholder
 * @param {'text'|'title'|'avatar'|'btn'|'card'} variant
 * @param {string} width  — override width
 * @param {string} height — override height
 */
export function Skeleton({ variant = 'text', width, height, className = '', style = {}, ...props }) {
  const cls = ['skeleton', variant && `skeleton--${variant}`, className].filter(Boolean).join(' ');
  return (
    <div
      className={cls}
      style={{ ...(width && { width }), ...(height && { height }), ...style }}
      aria-hidden="true"
      {...props}
    />
  );
}

/** Convenience: a block of skeleton text lines */
export function SkeletonText({ lines = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? '70%' : '100%'} />
      ))}
    </div>
  );
}
