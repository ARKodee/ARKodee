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

  // ─── Filter State ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDifficulty, setActiveDifficulty] = useState('ALL');

  // Internal debounce ref — stores the pending timer ID across renders.
  const debounceTimer = useRef(null);

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

  // ─── Effect 2: Reactive Filter Refetch with Debounce ─────────────────────────
  // Observes searchQuery and activeDifficulty. A 300ms debounce on search
  // prevents excessive backend calls while the user is typing.
  useEffect(() => {
    // Skip the very first render (initial load is handled by Effect 1).
    // We track this with a ref that flips after mount.
    // Clear any pending debounce timer from the previous keystroke.
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
        });
        setProblems(Array.isArray(data) ? data : (data?.results ?? []));
      } catch (err) {
        setProblemsError(err.message ?? 'Failed to filter problems.');
        setProblems([]);
      } finally {
        setIsLoadingProblems(false);
      }
    };

    // Apply debounce only to text search; difficulty changes fire immediately.
    const delay = searchQuery !== '' ? 300 : 0;
    debounceTimer.current = setTimeout(executeRefetch, delay);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, activeDifficulty]);

  // ─── Derived Tracking Metrics ─────────────────────────────────────────────────
  const totalProblems = problems.length;
  const solvedCount = problems.filter((p) => p.is_solved === true).length;
  const attemptedCount = problems.filter(
    (p) => p.is_attempted === true && p.is_solved !== true
  ).length;

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

    // Tracking metrics
    totalProblems,
    solvedCount,
    attemptedCount,

    // Filter query strings
    searchQuery,
    activeDifficulty,

    // State modifier functions
    setSearchQuery,
    setActiveDifficulty,
  };
}
