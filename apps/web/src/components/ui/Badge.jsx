// src/components/ui/Badge.jsx
import React from 'react';
import './ui.css';

/**
 * Badge
 * @param {'default'|'accent'|'success'|'warning'|'danger'|'info'} variant
 */
export function Badge({ children, variant = 'default', className = '', ...props }) {
  return (
    <span className={`badge badge--${variant} ${className}`} {...props}>
      {children}
    </span>
  );
}
