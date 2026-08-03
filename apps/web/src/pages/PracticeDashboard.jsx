// src/pages/PracticeDashboard.jsx
import React from 'react';
import { useProblems } from '../hooks/useProblems';
import { FilterPanel } from '../components/practice/FilterPanel';
import { ProblemTable } from '../components/practice/ProblemTable';
import { SubmissionCalendar } from '../components/practice/SubmissionCalendar';
import { Navbar } from '../components/layout/Navbar';
import { Skeleton } from '../components/ui/Skeleton';
import './PracticeDashboard.css';

function StatCard({ label, value, variant, isLoading }) {
  return (
    <div className={`prac-stat prac-stat--${variant}`}>
      <span className="prac-stat__value">
        {isLoading ? <Skeleton width="40px" height="var(--text-lg)" /> : value}
      </span>
      <span className="prac-stat__label">{label}</span>
    </div>
  );
}

export function PracticeDashboard() {
  const {
    problems, submissionCalendar,
    isLoadingProblems, isLoadingCalendar,
    problemsError, calendarError,
    totalProblems, solvedCount, attemptedCount,
    searchQuery, activeDifficulty,
    setSearchQuery, setActiveDifficulty,
  } = useProblems();

  return (
    <div className="prac-page" id="practice-dashboard">
      <Navbar />

      <div className="prac-body">
        {/* Page header */}
        <div className="prac-page-header">
          <h1 className="prac-page-title">Practice</h1>
          <p className="prac-page-sub">Sharpen your skills and track your progress.</p>
        </div>

        {/* Stats strip */}
        <div className="prac-stats" aria-label="Problem statistics">
          <StatCard label="Total"     value={totalProblems}                              variant="accent"   isLoading={isLoadingProblems} />
          <StatCard label="Solved"    value={solvedCount}                                variant="success"  isLoading={isLoadingProblems} />
          <StatCard label="Attempted" value={attemptedCount}                             variant="warning"  isLoading={isLoadingProblems} />
          <StatCard label="Remaining" value={totalProblems - solvedCount - attemptedCount} variant="default" isLoading={isLoadingProblems} />
        </div>

        {/* Main grid */}
        <div className="prac-grid">
          {/* Left — filter + table */}
          <section className="prac-main" aria-label="Problems workspace">
            {problemsError && (
              <div className="prac-error" role="alert">{problemsError}</div>
            )}
            <FilterPanel
              searchQuery={searchQuery}
              activeDifficulty={activeDifficulty}
              onSearchChange={setSearchQuery}
              onDifficultyChange={setActiveDifficulty}
            />
            <ProblemTable problems={problems.slice(0, 50)} isLoading={isLoadingProblems} />
          </section>

          {/* Right — calendar */}
          <aside className="prac-side" aria-label="Activity sidebar">
            {calendarError && (
              <div className="prac-error" role="alert">{calendarError}</div>
            )}
            <SubmissionCalendar calendarData={submissionCalendar} isLoading={isLoadingCalendar} />
          </aside>
        </div>
      </div>
    </div>
  );
}
