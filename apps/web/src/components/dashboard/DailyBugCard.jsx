// src/components/dashboard/DailyBugCard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDailyBug } from '../../lib/bugs';

/**
 * DailyBugCard Component
 *
 * Renders the Daily Bug Challenge card strictly from data fetched via lib/bugs.js.
 * Contains no hardcoded fallback strings or objects.
 */
export function DailyBugCard() {
  const navigate = useNavigate();
  const [bugData, setBugData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    getDailyBug()
      .then((data) => {
        if (isMounted) {
          setBugData(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load daily bug:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load daily bug');
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSquashClick = () => {
    if (bugData?.bug_id) {
      navigate(`/debug/${bugData.bug_id}`);
    }
  };

  if (isLoading) {
    return (
      <div
        className="w-full flex flex-col justify-between p-5 rounded-xl border font-mono shadow-md animate-pulse"
        style={{ background: '#111113', borderColor: '#1f1f24' }}
      >
        <div className="h-4 bg-[#16161a] rounded w-1/3 mb-4" />
        <div className="h-6 bg-[#16161a] rounded w-2/3 mb-2" />
        <div className="h-12 bg-[#16161a] rounded w-full my-3" />
        <div className="h-8 bg-[#16161a] rounded w-full mt-4" />
      </div>
    );
  }

  if (error || !bugData) {
    return (
      <div
        className="w-full flex flex-col justify-between p-5 rounded-xl border font-mono shadow-md"
        style={{ background: '#111113', borderColor: '#1f1f24' }}
      >
        <div className="text-xs text-[#555568] font-bold uppercase tracking-wider mb-2">
          Daily Bug Bounty
        </div>
        <p className="text-xs text-[#8888a0] font-sans">
          {error || 'No active bug bounty challenge available.'}
        </p>
      </div>
    );
  }

  const {
    bug_id,
    title,
    category,
    date,
    description,
    sample_input,
    expected_output,
    streak,
    xp_reward,
    is_solved,
  } = bugData;

  return (
    <div
      className="w-full flex flex-col justify-between p-5 rounded-xl border transition-all duration-200 group shadow-md"
      style={{
        background: '#111113',
        borderColor: '#1f1f24',
      }}
    >
      {/* 1. Header Row */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#1f1f24]">
        <div className="flex items-center gap-2">
          {bug_id && (
            <span className="text-xs font-mono font-bold text-[#e8e8f0] bg-[#16161a] border border-[#1f1f24] px-2.5 py-0.5 rounded">
              #{bug_id}
            </span>
          )}
          {category && (
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {category}
            </span>
          )}
        </div>
        {date && (
          <span className="text-xs font-mono text-[#555568] font-medium">
            {date}
          </span>
        )}
      </div>

      {/* 2. Body Section */}
      <div className="my-4 space-y-3">
        <div>
          <span className="text-[10px] font-mono font-semibold tracking-wider uppercase text-[#818cf8] block mb-1">
            DAILY BUG BOUNTY
          </span>
          <h3 className="text-lg font-bold font-sans text-[#e8e8f0] group-hover:text-[#818cf8] transition-colors tracking-tight">
            {title}
          </h3>
        </div>

        {description && (
          <p className="text-xs font-sans text-[#8888a0] leading-relaxed font-normal">
            {description}
          </p>
        )}

        {/* Sample Input / Expected Output Preview Box */}
        {(sample_input || expected_output) && (
          <div className="bg-[#16161a] border border-[#1f1f24] rounded-lg p-3.5 space-y-2 font-mono text-xs">
            {sample_input && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#555568] font-semibold text-[10px] uppercase tracking-wider select-none">
                  Input
                </span>
                <code className="text-[#818cf8] font-medium bg-[#111113] px-2 py-0.5 rounded border border-[#1f1f24] text-[11px] break-all">
                  {sample_input}
                </code>
              </div>
            )}
            {expected_output && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#555568] font-semibold text-[10px] uppercase tracking-wider select-none">
                  Expected
                </span>
                <code className="text-[#34d399] font-bold bg-[#111113] px-2 py-0.5 rounded border border-[#1f1f24] text-[11px] break-all">
                  {expected_output}
                </code>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Footer Actions Row */}
      <div className="pt-3.5 border-t border-[#1f1f24] space-y-3">
        <div className="flex items-center justify-between">
          {streak !== undefined && (
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded">
              <span>🔥</span>
              <span>{streak} Day Streak</span>
            </div>
          )}

          {xp_reward !== undefined && (
            <div className="text-xs font-mono font-semibold text-[#818cf8] bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded">
              +{xp_reward} XP
            </div>
          )}
        </div>

        {is_solved ? (
          <div className="w-full py-2.5 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[#34d399] font-sans font-semibold text-xs flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-[#34d399]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>✓ Squashed</span>
          </div>
        ) : (
          <button
            onClick={handleSquashClick}
            className="w-full py-2.5 px-4 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white font-sans font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <span>Squash Bug</span>
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default DailyBugCard;
