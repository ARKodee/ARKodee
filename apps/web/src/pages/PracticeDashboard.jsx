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
    totalProblems, solvedCount, attemptedCount, totalFilteredCount, totalScore,
    searchQuery, activeDifficulty, currentPage, pageSize,
    setSearchQuery, setActiveDifficulty, setCurrentPage,
  } = useProblems();

  const totalPages = Math.ceil(totalFilteredCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;

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
          <StatCard label="Total"     value={totalProblems}                              variant="default"  isLoading={isLoadingProblems} />
          <StatCard label="Solved"    value={solvedCount}                                variant="success"  isLoading={isLoadingProblems} />
          <StatCard label="Attempted" value={attemptedCount}                             variant="warning"  isLoading={isLoadingProblems} />
          <StatCard label="Remaining" value={totalProblems - solvedCount - attemptedCount} variant="default"  isLoading={isLoadingProblems} />
          <StatCard label="Score"     value={`${totalScore} pts`}                        variant="accent"   isLoading={isLoadingProblems} />
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
            <ProblemTable 
              problems={problems} 
              isLoading={isLoadingProblems} 
              startIndex={startIndex}
            />

            {/* Pagination Controls */}
            {!isLoadingProblems && totalPages > 1 && (
              <div className="prac-pagination">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="prac-pagination-btn"
                >
                  Previous
                </button>
                <span className="prac-pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className="prac-pagination-btn"
                >
                  Next
                </button>
              </div>
            )}
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

export default PracticeDashboard;
