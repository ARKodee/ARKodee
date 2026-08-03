// src/components/ui/Spinner.jsx
import React from 'react';
import './ui.css';

/**
 * Spinner — standalone loading indicator
 * @param {'sm'|'md'|'lg'} size
 */
export function Spinner({ size = 'md', className = '', ...props }) {
  return <div className={`spinner spinner--${size} ${className}`} role="status" aria-label="Loading" {...props} />;
}
