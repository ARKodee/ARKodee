// src/pages/PracticeDashboard.jsx
// Page Conductor Layout Shell — orchestrates the grid architecture.
// All state management delegated entirely to the useProblems hook.
import React from 'react';
import { useProblems } from '../hooks/useProblems';
import { FilterPanel } from '../components/practice/FilterPanel';
import { ProblemTable } from '../components/practice/ProblemTable';
import { SubmissionCalendar } from '../components/practice/SubmissionCalendar';
import { ProfileHUD } from '../components/dashboard/ProfileHUD';
import { TacticalNav } from '../components/dashboard/TacticalNav';

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
    <div
      className="w-screen min-h-screen flex flex-col font-mono"
      style={{ background: '#020617', color: '#ffffff', overflowY: 'auto' }}
    >
      {/* Scanline sweep */}
      <div
        className="pointer-events-none fixed inset-x-0 z-50 animate-scan-line"
        style={{
          height: 3,
          background:
            'linear-gradient(transparent 0%, rgba(245,158,11,0.045) 50%, transparent 100%)',
        }}
      />

      {/* Dot-grid background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(245,158,11,0.018) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(245,158,11,0.018) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Top Header layout matching Dashboard */}
      <header className="relative z-10 flex-shrink-0 flex items-center gap-4 p-4">
        <ProfileHUD />
        <div className="flex-1 min-w-0">
          <TacticalNav />
        </div>
      </header>

      {/* Main scrollable content */}
      <main className="pd-root relative z-10 flex-1" id="practice-dashboard">
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
              problems={problems.slice(0, 50)}
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
    </div>
  );
}
