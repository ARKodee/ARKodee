// src/components/practice/ProblemTable.jsx
// Presentational Component — receives a calculated array of problems via props
// and renders an interactive tabular list. No internal state or data fetching.
import React from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Sub-components ────────────────────────────────────────────────────────────

/**
 * StatusIndicator
 * Renders a graphical symbol reflecting the problem's completion state.
 *   - Solved    → solid green checkmark circle
 *   - Attempted → amber dash/minus circle
 *   - Untouched → neutral empty ring
 */
function StatusIndicator({ isSolved, isAttempted }) {
  if (isSolved) {
    return (
      <span className="pt-status pt-status--solved" title="Solved" aria-label="Solved">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M8 12.5l3 3 5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  if (isAttempted) {
    return (
      <span className="pt-status pt-status--attempted" title="Attempted" aria-label="Attempted">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.12" />
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M8 12h8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className="pt-status pt-status--untouched" title="Not attempted" aria-label="Not attempted">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </span>
  );
}

/**
 * DifficultyBadge
 * Color-coded pill badge for the problem difficulty level.
 */
function DifficultyBadge({ difficulty }) {
  const normalised = (difficulty ?? '').toUpperCase();
  const classMap = {
    EASY:   'pt-badge pt-badge--easy',
    MEDIUM: 'pt-badge pt-badge--medium',
    HARD:   'pt-badge pt-badge--hard',
  };
  const labelMap = {
    EASY:   'Easy',
    MEDIUM: 'Medium',
    HARD:   'Hard',
  };

  return (
    <span className={classMap[normalised] ?? 'pt-badge'}>
      {labelMap[normalised] ?? difficulty}
    </span>
  );
}

// ─── Empty & Loading States ────────────────────────────────────────────────────

function EmptyState() {
  return (
    <tr>
      <td colSpan={4} className="pt-empty">
        <div className="pt-empty-inner">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            aria-hidden="true"
          >
            <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
          <p>No problems match your filters.</p>
          <span>Try adjusting your search or difficulty selection.</span>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

/**
 * ProblemTable
 *
 * Props:
 *  - problems {Array} Calculated array of problem objects from the parent hook.
 *    Each problem shape expected from backend:
 *    {
 *      id, slug, title, difficulty, points,
 *      is_solved, is_attempted
 *    }
 */
export function ProblemTable({ problems = [], isLoading = false }) {
  const navigate = useNavigate();

  const handleRowClick = (slug) => {
    navigate(`/practice/problems/${slug}`);
  };

  const handleRowKeyDown = (e, slug) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/practice/problems/${slug}`);
    }
  };

  return (
    <div className="pt-root">
      <table className="pt-table" role="table" aria-label="Practice problems list">
        {/* ── Table Header ─────────────────────────────────────────────── */}
        <thead className="pt-thead">
          <tr>
            <th className="pt-th pt-th--status" scope="col" aria-label="Status">
              <span className="sr-only">Status</span>
            </th>
            <th className="pt-th pt-th--title" scope="col">Challenge</th>
            <th className="pt-th pt-th--difficulty" scope="col">Difficulty</th>
            <th className="pt-th pt-th--points" scope="col">Points</th>
          </tr>
        </thead>

        {/* ── Table Body ────────────────────────────────────────────────── */}
        <tbody className="pt-tbody">
          {isLoading ? (
            // Skeleton rows while loading
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={`skel-${i}`} className="pt-row pt-row--skeleton" aria-hidden="true">
                <td className="pt-td pt-td--status">
                  <div className="pt-skeleton pt-skeleton--circle" />
                </td>
                <td className="pt-td pt-td--title">
                  <div className="pt-skeleton" style={{ width: `${55 + (i % 4) * 10}%` }} />
                </td>
                <td className="pt-td pt-td--difficulty">
                  <div className="pt-skeleton pt-skeleton--badge" />
                </td>
                <td className="pt-td pt-td--points">
                  <div className="pt-skeleton pt-skeleton--sm" />
                </td>
              </tr>
            ))
          ) : problems.length === 0 ? (
            <EmptyState />
          ) : (
            problems.map((problem, index) => (
              <tr
                key={problem.id ?? problem.slug ?? index}
                className="pt-row"
                role="row"
                tabIndex={0}
                onClick={() => handleRowClick(problem.slug)}
                onKeyDown={(e) => handleRowKeyDown(e, problem.slug)}
                aria-label={`${problem.title} — ${problem.difficulty}`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {/* Status */}
                <td className="pt-td pt-td--status" role="cell">
                  <StatusIndicator
                    isSolved={problem.is_solved}
                    isAttempted={problem.is_attempted}
                  />
                </td>

                {/* Title */}
                <td className="pt-td pt-td--title" role="cell">
                  <span className="pt-problem-number">
                    {String(problem.id ?? index + 1).padStart(3, '0')}.
                  </span>
                  <span className="pt-problem-title">{problem.title}</span>
                </td>

                {/* Difficulty */}
                <td className="pt-td pt-td--difficulty" role="cell">
                  <DifficultyBadge difficulty={problem.difficulty} />
                </td>

                {/* Points */}
                <td className="pt-td pt-td--points" role="cell">
                  <span className="pt-points">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {problem.points ?? '—'}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
