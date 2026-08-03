// src/components/ui/Card.jsx
import React from 'react';
import './ui.css';

/**
 * Card — surface container
 * @param {boolean} elevated  — uses --bg-elevated instead of --bg-surface
 * @param {boolean} interactive — adds hover effect
 */
export function Card({ children, elevated = false, interactive = false, className = '', ...props }) {
  const cls = [
    'card',
    elevated && 'card--elevated',
    interactive && 'card--interactive',
    className,
  ].filter(Boolean).join(' ');
  return <div className={cls} {...props}>{children}</div>;
}

export function CardHeader({ children, className = '', ...props }) {
  return <div className={`card__header ${className}`} {...props}>{children}</div>;
}

export function CardTitle({ children, className = '', ...props }) {
  return <h3 className={`card__title ${className}`} {...props}>{children}</h3>;
}

export function CardBody({ children, className = '', ...props }) {
  return <div className={`card__body ${className}`} {...props}>{children}</div>;
}

export function CardFooter({ children, className = '', ...props }) {
  return <div className={`card__footer ${className}`} {...props}>{children}</div>;
}
