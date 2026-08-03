// src/components/ui/EmptyState.jsx
import React from 'react';
import './ui.css';

/**
 * EmptyState — shown when no data / error fallback
 */
export function EmptyState({ icon, title, description, action, className = '' }) {
  return (
    <div className={`empty-state ${className}`}>
      {icon && <div className="empty-state__icon">{icon}</div>}
      {title && <p className="empty-state__title">{title}</p>}
      {description && <p className="empty-state__desc">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
