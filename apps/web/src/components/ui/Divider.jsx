// src/components/ui/Divider.jsx
import React from 'react';
import './ui.css';

/**
 * Divider
 * @param {boolean} vertical
 * @param {string} label — optional centered label text
 */
export function Divider({ vertical = false, label, className = '', ...props }) {
  if (label) {
    return <div className={`divider--label ${className}`} {...props}>{label}</div>;
  }
  if (vertical) {
    return <div className={`divider divider--vertical ${className}`} {...props} />;
  }
  return <hr className={`divider ${className}`} {...props} />;
}
