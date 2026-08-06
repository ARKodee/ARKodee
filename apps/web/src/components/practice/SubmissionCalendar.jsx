// src/components/practice/SubmissionCalendar.jsx
// Presentational Component — renders an immersive pixel-heatmap activity grid.
// Consumes a timestamp-to-count dictionary map through props.
import React, { useMemo, useState } from 'react';
import './SubmissionCalendar.css';

// ─── Constants ─────────────────────────────────────────────────────────────────

const WEEKS_TO_SHOW = 53;        // ~1 full year of contribution data
const DAYS_PER_WEEK = 7;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Maps a submission count to a CSS class representing the intensity tier.
 * Tiers: 0 = none, 1 = low, 2 = mid, 3 = high, 4 = peak
 */
function getIntensityClass(count, maxCount) {
  if (!count || count === 0) return 'sc-cell--none';
  if (maxCount === 0) return 'sc-cell--none';

  const ratio = count / maxCount;
  if (ratio <= 0.20) return 'sc-cell--t1';
  if (ratio <= 0.45) return 'sc-cell--t2';
  if (ratio <= 0.75) return 'sc-cell--t3';
  return 'sc-cell--t4';
}

function normalizeDate(dateLike) {
  if (!dateLike) return null;

  const parsedDate = dateLike instanceof Date ? new Date(dateLike) : new Date(dateLike);
  if (Number.isNaN(parsedDate.getTime())) return null;

  parsedDate.setHours(0, 0, 0, 0);
  return parsedDate;
}

/**
 * Build the calendar grid data structure from a timestamp→count dictionary.
 *
 * The grid is an array of weeks (columns), each week being an array of 7
 * day objects: { date: Date, count: number, label: string }.
 *
 * We work backwards from today to produce the trailing WEEKS_TO_SHOW weeks.
 */
function buildCalendarGrid(calendarData, startDate, weeksToShow = WEEKS_TO_SHOW) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const anchorDate = normalizeDate(startDate);

  // Determine the Sunday that starts our visible window.
  // If an anchor is available, start from the first activity; otherwise show the trailing year.
  const defaultWindowStart = new Date(today);
  const dayOfWeek = today.getDay(); // 0 = Sun
  const windowWeeks = Math.max(1, weeksToShow);
  defaultWindowStart.setDate(today.getDate() - dayOfWeek - (windowWeeks - 1) * 7);

  const windowStart = anchorDate
    ? (anchorDate > defaultWindowStart ? new Date(anchorDate) : new Date(defaultWindowStart))
    : defaultWindowStart;

  const startDay = windowStart.getDay();
  windowStart.setDate(windowStart.getDate() - startDay);
  windowStart.setHours(0, 0, 0, 0);

  const grid = [];
  let maxCount = 0;

  for (let w = 0; w < windowWeeks; w++) {
    const week = [];
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      const cellDate = new Date(windowStart);
      cellDate.setDate(windowStart.getDate() + w * 7 + d);
      cellDate.setHours(0, 0, 0, 0);

      // Convert to Unix timestamp (seconds) to match Django backend format
      const unixTs = Math.floor(cellDate.getTime() / 1000);

      // Look up by exact unix timestamp OR by ISO date string (flexible)
      // Format locally to prevent timezone offsets from shifting dates back to the previous day
      const year = cellDate.getFullYear();
      const month = String(cellDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(cellDate.getDate()).padStart(2, '0');
      const isoKey = `${year}-${month}-${dayStr}`;
      const count = calendarData[unixTs] ?? calendarData[isoKey] ?? 0;

      if (count > maxCount) maxCount = count;

      week.push({
        date: cellDate,
        count,
        isFuture: cellDate > today,
        label: `${MONTH_LABELS[cellDate.getMonth()]} ${cellDate.getDate()}, ${cellDate.getFullYear()}${count > 0 ? ` — ${count} submission${count !== 1 ? 's' : ''}` : ''}`,
      });
    }
    grid.push(week);
  }

  return { grid, maxCount };
}

/**
 * Compute which weeks each month label should appear above (for the x-axis).
 */
function buildMonthMarkers(grid) {
  const markers = [];
  let lastMonth = -1;
  let lastMarkerWeek = -10;

  grid.forEach((week, wi) => {
    // Use the first non-future day in the week
    const firstDay = week[0];
    const month = firstDay.date.getMonth();
    if (month !== lastMonth && wi - lastMarkerWeek >= 3) {
      markers.push({ weekIndex: wi, label: MONTH_LABELS[month] });
      lastMonth = month;
      lastMarkerWeek = wi;
    }
  });

  return markers;
}

// ─── Main Component ────────────────────────────────────────────────────────────

/**
 * SubmissionCalendar
 *
 * Props:
 *  - calendarData {Object} Unix-timestamp (or ISO date) → submission count dictionary.
 *                          e.g. { 1718841600: 3, 1718928000: 1 }
 *  - isLoading    {boolean} Shows skeleton shimmer while data loads.
 */
export function SubmissionCalendar({
  calendarData = {},
  isLoading = false,
  startDate = null,
  weeksToShow = WEEKS_TO_SHOW,
  compact = false,
}) {
  const { grid, maxCount } = useMemo(
    () => buildCalendarGrid(calendarData, startDate, weeksToShow),
    [calendarData, startDate, weeksToShow]
  );
  const [selectedDay, setSelectedDay] = useState(null);

  const monthMarkers = useMemo(() => buildMonthMarkers(grid), [grid]);

  // ── Aggregate stats ───────────────────────────────────────────────────────────
  const totalSubmissions = useMemo(
    () => Object.values(calendarData).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [calendarData]
  );

  const activeDays = useMemo(
    () => Object.values(calendarData).filter((v) => Number(v) > 0).length,
    [calendarData]
  );

  if (isLoading) {
    return (
      <div className={`sc-root sc-root--loading${compact ? ' sc-root--compact' : ''}`} aria-busy="true" aria-label="Loading activity calendar">
        <div className="sc-header">
          <div className="sc-skeleton sc-skeleton--title" />
          <div className="sc-skeleton sc-skeleton--stat" />
        </div>
        <div className="sc-grid-skeleton">
          {Array.from({ length: 53 }).map((_, i) => (
            <div key={i} className="sc-col-skeleton">
              {Array.from({ length: 7 }).map((_, j) => (
                <div key={j} className="sc-cell sc-cell--skeleton" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`sc-root${compact ? ' sc-root--compact' : ''}`} aria-label="Submission activity calendar">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="sc-header">
        <h3 className="sc-title">Activity</h3>
        <div className="sc-stats">
          <span className="sc-stat">
            <span className="sc-stat-value">{totalSubmissions}</span>
            <span className="sc-stat-label">submissions</span>
          </span>
          <span className="sc-divider" aria-hidden="true">·</span>
          <span className="sc-stat">
            <span className="sc-stat-value">{activeDays}</span>
            <span className="sc-stat-label">active days</span>
          </span>
        </div>
      </div>

      {/* ── Calendar Grid Wrapper ──────────────────────────────────────── */}
      <div className="sc-scroll-wrap">
        <div className="sc-canvas" style={{ '--sc-weeks': grid.length }}>
          {!compact && (
            <div className="sc-month-row" aria-hidden="true">
              <div className="sc-day-gutter" />
              <div className="sc-month-track" style={{ '--sc-weeks': grid.length }}>
                {monthMarkers.map(({ weekIndex, label }) => (
                  <span
                    key={`${weekIndex}-${label}`}
                    className="sc-month-label"
                    style={{ '--sc-week-index': weekIndex }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Grid body: day-of-week labels + cell columns */}
          <div className={`sc-body${compact ? ' sc-body--compact' : ''}`}>
            {!compact && (
              <div className="sc-day-labels" aria-hidden="true">
                {DAY_LABELS.map((d, i) => (
                  <span key={d} className={`sc-day-label${i % 2 === 0 ? ' sc-day-label--hidden' : ''}`}>
                    {d}
                  </span>
                ))}
              </div>
            )}

            {/* Week columns */}
            <div className="sc-grid" role="grid" aria-label="Contribution grid">
              {grid.map((week, wi) => (
                <div key={wi} className="sc-week" role="row">
                  {week.map((day, di) => (
                    <button
                      key={di}
                      type="button"
                      role="gridcell"
                      aria-pressed={selectedDay?.date?.getTime() === day.date.getTime()}
                      className={`sc-cell ${day.isFuture ? 'sc-cell--future' : getIntensityClass(day.count, maxCount)}${selectedDay?.date?.getTime() === day.date.getTime() ? ' sc-cell--selected' : ''}`}
                      title={day.label}
                      aria-label={day.label}
                      onClick={() => setSelectedDay(day)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div className="sc-legend" aria-label="Activity intensity legend">
        <span className="sc-legend-label">Less</span>
        <div className="sc-cell sc-cell--none sc-legend-cell" />
        <div className="sc-cell sc-cell--t1 sc-legend-cell" />
        <div className="sc-cell sc-cell--t2 sc-legend-cell" />
        <div className="sc-cell sc-cell--t3 sc-legend-cell" />
        <div className="sc-cell sc-cell--t4 sc-legend-cell" />
        <span className="sc-legend-label">More</span>
      </div>

      {selectedDay && (
        <div className="sc-selection" aria-live="polite">
          Selected: <span className="sc-selection__date">{selectedDay.label}</span>
        </div>
      )}
    </div>
  );
}
