// src/hooks/useProblems.js
// Central State Hook Brain — isolates all state management, side effects,
// and debouncing entirely out of layout views.
import { useState, useEffect, useRef } from 'react';
import { getProblemsList, getSubmissionCalendar } from '../lib/problems';

/**
 * useProblems — The core operational brain for the Practice feature.
 *
 * Manages:
 *  - Problem list data + loading/error states
 *  - Submission calendar data
 *  - Search query string with 300ms debounce
 *  - Active difficulty tab filter
 *  - Current page pagination (server-side limits)
 *
 * @returns {Object} Structured contract of values, metrics, statuses, and setters.
 */
export function useProblems() {
  // ─── Data State ──────────────────────────────────────────────────────────────
  const [problems, setProblems] = useState([]);
  const [submissionCalendar, setSubmissionCalendar] = useState({});

  // ─── Loading / Error States ───────────────────────────────────────────────────
  const [isLoadingProblems, setIsLoadingProblems] = useState(true);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(true);
  const [problemsError, setProblemsError] = useState(null);
  const [calendarError, setCalendarError] = useState(null);

  // ─── Filter & Pagination State ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDifficulty, setActiveDifficulty] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // ─── Database-Level Metrics ──────────────────────────────────────────────────
  const [totalProblems, setTotalProblems] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [attemptedCount, setAttemptedCount] = useState(0);
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);

  // Internal debounce ref — stores the pending timer ID across renders.
  const debounceTimer = useRef(null);

  // ─── Reset page to 1 on filter/search queries change ──────────────────────────
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeDifficulty]);

  // ─── Effect 1: Initial Calendar Data Sync ────────────────────────────────────
  // Fires once on mount to fetch the user's submission activity calendar.
  useEffect(() => {
    let isMounted = true;

    const fetchCalendarData = async () => {
      setIsLoadingCalendar(true);
      try {
        const data = await getSubmissionCalendar();
        if (!isMounted) return;
        setSubmissionCalendar(data ?? {});
        setCalendarError(null);
      } catch (err) {
        if (!isMounted) return;
        setCalendarError(err.message ?? 'Failed to load calendar.');
        setSubmissionCalendar({});
      } finally {
        if (isMounted) setIsLoadingCalendar(false);
      }
    };

    fetchCalendarData();

    return () => { isMounted = false; };
  }, []);

  // ─── Effect 2: Reactive Filter & Paginated Refetch with Debounce ─────────────
  // Observes searchQuery, activeDifficulty, and currentPage. A 300ms debounce on
  // search prevents excessive backend calls while the user is typing.
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const executeRefetch = async () => {
      setIsLoadingProblems(true);
      setProblemsError(null);

      try {
        const data = await getProblemsList({
          search: searchQuery,
          difficulty: activeDifficulty,
          page: currentPage,
          page_size: pageSize,
        });
        setProblems(data?.results ?? []);
        setTotalProblems(data?.total_problems ?? 0);
        setSolvedCount(data?.solved_count ?? 0);
        setAttemptedCount(data?.attempted_count ?? 0);
        setTotalFilteredCount(data?.total_filtered_count ?? 0);
      } catch (err) {
        setProblemsError(err.message ?? 'Failed to filter problems.');
        setProblems([]);
      } finally {
        setIsLoadingProblems(false);
      }
    };

    // Apply debounce only to text search; difficulty and page changes fire immediately.
    const delay = searchQuery !== '' ? 300 : 0;
    debounceTimer.current = setTimeout(executeRefetch, delay);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, activeDifficulty, currentPage]);

  // ─── Packaged Contract ────────────────────────────────────────────────────────
  return {
    // Data collections
    problems,
    submissionCalendar,

    // Loading states
    isLoadingProblems,
    isLoadingCalendar,

    // Error states
    problemsError,
    calendarError,

    // Tracking metrics (Calculated on server database level)
    totalProblems,
    solvedCount,
    attemptedCount,
    totalFilteredCount,

    // Filter query strings & pagination
    searchQuery,
    activeDifficulty,
    currentPage,
    pageSize,

    // State modifier functions
    setSearchQuery,
    setActiveDifficulty,
    setCurrentPage,
  };
}

export default useProblems;
