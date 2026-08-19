// src/components/ui/Input.jsx
import React from 'react';
import './ui.css';

/**
 * Input
 * @param {string} label
 * @param {string} error
 * @param {string} hint
 * @param {ReactNode} icon — left icon element
 * @param {boolean} textarea — render <textarea> instead
 */
export function Input({
  label,
  error,
  hint,
  icon,
  textarea = false,
  className = '',
  id,
  ...props
}) {
  const fieldId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const inputCls = [
    textarea ? 'input input--textarea' : 'input',
    icon && 'input--with-icon',
    error && 'input--error',
    className,
  ].filter(Boolean).join(' ');

  const Tag = textarea ? 'textarea' : 'input';

  return (
    <div className="input-wrap">
      {label && (
        <label className="input-label" htmlFor={fieldId}>
          {label}
        </label>
      )}
      <div className="input-field-wrap">
        {icon && <span className="input-icon">{icon}</span>}
        <Tag id={fieldId} className={inputCls} {...props} />
      </div>
      {error && <span className="input-error-msg">{error}</span>}
      {hint && !error && <span className="input-hint">{hint}</span>}
    </div>
  );
}
