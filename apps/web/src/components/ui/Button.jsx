// src/components/ui/Button.jsx
import React from 'react';
import './ui.css';

/**
 * Button
 * @param {'primary'|'secondary'|'ghost'|'danger'|'outline'} variant
 * @param {'sm'|'md'|'lg'} size
 * @param {boolean} icon  — square icon-only button
 * @param {boolean} loading
 * @param {boolean} disabled
 * @param {string} className  — additional classes
 */
export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  icon = false,
  loading = false,
  isLoading = false,
  disabled = false,
  className = '',
  as: Tag = 'button',
  ...props
}) {
  const isCurrentlyLoading = loading || isLoading;
  const cls = [
    'btn',
    `btn--${variant}`,
    size !== 'md' && `btn--${size}`,
    icon && 'btn--icon',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Tag className={cls} disabled={disabled || isCurrentlyLoading} {...props}>
      {isCurrentlyLoading && <span className="btn__spinner" aria-hidden="true" />}
      {children}
    </Tag>
  );
}
