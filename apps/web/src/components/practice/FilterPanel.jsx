// src/components/practice/FilterPanel.jsx
// Presentational Component — no internal state, no data fetching.
// All values and mutators arrive exclusively through props.
import React from 'react';

/**
 * DIFFICULTY_TABS
 * Ordered list of difficulty filter options displayed as toggle navigation.
 */
const DIFFICULTY_TABS = [
  { key: 'ALL',    label: 'All'    },
  { key: 'EASY',   label: 'Easy'   },
  { key: 'MEDIUM', label: 'Medium' },
  { key: 'HARD',   label: 'Hard'   },
];

/**
 * FilterPanel
 *
 * Props:
 *  - searchQuery      {string}   Current search string value.
 *  - activeDifficulty {string}   Currently active difficulty key ("ALL" | "EASY" | "MEDIUM" | "HARD").
 *  - onSearchChange   {Function} Called with new string value on every input keystroke.
 *  - onDifficultyChange {Function} Called with difficulty key string on tab click.
 */
export function FilterPanel({
  searchQuery,
  activeDifficulty,
  onSearchChange,
  onDifficultyChange,
}) {
  return (
    <div className="fp-root" role="search" aria-label="Problem filters">
      {/* ── Search Input ──────────────────────────────────────────────────── */}
      <div className="fp-search-wrap">
        <span className="fp-search-icon" aria-hidden="true">
          {/* Magnifying glass SVG */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>

        <input
          id="fp-search-input"
          className="fp-search-input"
          type="search"
          placeholder="Search problems…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          autoComplete="off"
          spellCheck="false"
          aria-label="Search problems"
        />

        {/* Clear button — only visible when there is text */}
        {searchQuery.length > 0 && (
          <button
            className="fp-search-clear"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Difficulty Navigation Tabs ────────────────────────────────────── */}
      <nav className="fp-tabs" role="tablist" aria-label="Filter by difficulty">
        {DIFFICULTY_TABS.map(({ key, label }) => {
          const isActive = activeDifficulty === key;
          return (
            <button
              key={key}
              id={`fp-tab-${key.toLowerCase()}`}
              role="tab"
              aria-selected={isActive}
              className={`fp-tab fp-tab--${key.toLowerCase()}${isActive ? ' fp-tab--active' : ''}`}
              onClick={() => onDifficultyChange(key)}
            >
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
