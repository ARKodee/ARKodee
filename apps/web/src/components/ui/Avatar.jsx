// src/components/ui/Avatar.jsx
import React from 'react';
import './ui.css';

/**
 * Avatar
 * @param {string} name  — used to derive initials
 * @param {string} src   — image src (optional)
 * @param {'xs'|'sm'|'md'} size
 */
export function Avatar({ name = '', src, size = 'sm', className = '', ...props }) {
  const initial = name ? name[0].toUpperCase() : '?';
  return (
    <div className={`avatar avatar--${size} ${className}`} title={name} {...props}>
      {src ? <img src={src} alt={name} /> : initial}
    </div>
  );
}
