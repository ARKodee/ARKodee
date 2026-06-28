// src/pages/PracticeDashboard.jsx
// Page Conductor Layout Shell — orchestrates the grid architecture.
// All state management delegated entirely to the useProblems hook.
import React from 'react';
import { useProblems } from '../hooks/useProblems';
import { FilterPanel } from '../components/practice/FilterPanel';
import { ProblemTable } from '../components/practice/ProblemTable';
import { SubmissionCalendar } from '../components/practice/SubmissionCalendar';

/**
 * StatCard — Compact metric tile for the stats strip above the table.
 */
function StatCard({ label, value, accentClass, isLoading }) {
  return (
    <div className={`pd-stat-card ${accentClass}`}>
      <span className="pd-stat-value">
        {isLoading ? <span className="pd-stat-skeleton" /> : value}
      </span>
      <span className="pd-stat-label">{label}</span>
    </div>
  );
}

/**
 * ErrorBanner — Non-blocking inline error notification.
 */
function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="pd-error-banner" role="alert" aria-live="polite">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────────

/**
 * PracticeDashboard
 *
 * Layout:
 *   ┌────────────────────────────────────┬────────────────┐
 *   │  Left column (2/3)                 │ Right (1/3)    │
 *   │  ┌──────────────────────────────┐  │ ┌────────────┐ │
 *   │  │ Stats Strip                  │  │ │ Submission │ │
 *   │  ├──────────────────────────────┤  │ │ Calendar   │ │
 *   │  │ FilterPanel                  │  │ └────────────┘ │
 *   │  ├──────────────────────────────┤  │                │
 *   │  │ ProblemTable                 │  │                │
 *   │  └──────────────────────────────┘  │                │
 *   └────────────────────────────────────┴────────────────┘
 */
export function PracticeDashboard() {
  // ── Delegate ALL state and side effects to the hook ──────────────────────────
  const {
    problems,
    submissionCalendar,
    isLoadingProblems,
    isLoadingCalendar,
    problemsError,
    calendarError,
    totalProblems,
    solvedCount,
    attemptedCount,
    searchQuery,
    activeDifficulty,
    setSearchQuery,
    setActiveDifficulty,
  } = useProblems();

  return (
    <main className="pd-root" id="practice-dashboard">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <header className="pd-header">
        <div className="pd-header-text">
          <h1 className="pd-heading">Practice Arena</h1>
          <p className="pd-subheading">
            Sharpen your skills. Track your progress. Conquer every challenge.
          </p>
        </div>
        <div className="pd-header-badge">
          <span className="pd-live-dot" aria-hidden="true" />
          <span>Live problems</span>
        </div>
      </header>

      {/* ── Main Grid ────────────────────────────────────────────────────── */}
      <div className="pd-grid">

        {/* ── Left Column (2/3) ──────────────────────────────────────── */}
        <section className="pd-col-main" aria-label="Problems workspace">

          {/* Stats Strip */}
          <div className="pd-stats-strip" aria-label="Problem statistics">
            <StatCard
              label="Total"
              value={totalProblems}
              accentClass="pd-stat-card--indigo"
              isLoading={isLoadingProblems}
            />
            <StatCard
              label="Solved"
              value={solvedCount}
              accentClass="pd-stat-card--emerald"
              isLoading={isLoadingProblems}
            />
            <StatCard
              label="Attempted"
              value={attemptedCount}
              accentClass="pd-stat-card--amber"
              isLoading={isLoadingProblems}
            />
            <StatCard
              label="Remaining"
              value={totalProblems - solvedCount - attemptedCount}
              accentClass="pd-stat-card--zinc"
              isLoading={isLoadingProblems}
            />
          </div>

          {/* Error banner for problems */}
          <ErrorBanner message={problemsError} />

          {/* Filter Controls */}
          <FilterPanel
            searchQuery={searchQuery}
            activeDifficulty={activeDifficulty}
            onSearchChange={setSearchQuery}
            onDifficultyChange={setActiveDifficulty}
          />

          {/* Problem Table */}
          <ProblemTable
            problems={problems}
            isLoading={isLoadingProblems}
          />
        </section>

        {/* ── Right Sidebar (1/3) ────────────────────────────────────── */}
        <aside className="pd-col-side" aria-label="Activity sidebar">

          {/* Error banner for calendar */}
          <ErrorBanner message={calendarError} />

          {/* Submission Calendar Heatmap */}
          <SubmissionCalendar
            calendarData={submissionCalendar}
            isLoading={isLoadingCalendar}
          />
        </aside>
      </div>
    </main>
  );
}
