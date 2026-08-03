// src/pages/ContestDetailsPage.jsx
// Contest Details Page — contest information and problem list
// Uses design system tokens, no Tailwind
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Shield,
  GraduationCap,
  Hash,
  ChevronRight,
  Loader2,
  AlertCircle,
  Trophy,
} from 'lucide-react';
import { getContestDetails, startVirtualContest, getContestLeaderboard } from '../lib/contests';
import { Leaderboard } from '../components/contests/Leaderboard';
import { Navbar } from '../components/layout/Navbar';
import './ContestDetailsPage.css';

// ─── Helper Functions ──────────────────────────────────────────────────────────
const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTimeLabel = (startTime, endTime) => {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  if (now < start) {
    const diff = start - now;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return { label: `Starts in ${hours}h ${mins}m`, status: 'upcoming' };
  }
  if (now >= start && now <= end) {
    const diff = end - now;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return { label: `${hours}h ${mins}m remaining`, status: 'active' };
  }
  return { label: 'Contest ended', status: 'ended' };
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function ContestDetailsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [virtualLoading, setVirtualLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('problems');

  // Fetch leaderboard when standings tab is active
  useEffect(() => {
    if (activeTab === 'standings' && leaderboard.length === 0) {
      let cancelled = false;
      const fetchLeaderboard = async () => {
        setLeaderboardLoading(true);
        try {
          const data = await getContestLeaderboard(slug);
          if (!cancelled) setLeaderboard(data || []);
        } catch (err) {
          console.warn('Failed to load standings:', err);
        } finally {
          if (!cancelled) setLeaderboardLoading(false);
        }
      };
      fetchLeaderboard();
      return () => { cancelled = true; };
    }
  }, [activeTab, slug, leaderboard.length]);

  // Fetch contest details
  useEffect(() => {
    let cancelled = false;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getContestDetails(slug);
        if (!cancelled) setContest(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Contest details could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDetails();
    return () => { cancelled = true; };
  }, [slug]);

  // Get virtual session status
  const getVirtualSessionStatus = () => {
    if (!contest) return { active: false };
    const storageKey = `virtual_start_${slug}`;
    const startTimeStr = localStorage.getItem(storageKey);
    if (!startTimeStr) return { active: false };

    const startTime = parseInt(startTimeStr, 10);
    const durationMs = new Date(contest.end_time).getTime() - new Date(contest.start_time).getTime();
    const isExpired = startTime + durationMs <= Date.now();

    return { active: !isExpired, startTime };
  };

  const sessionStatus = getVirtualSessionStatus();

  // Handle virtual contest start
  const handleStartVirtual = async () => {
    setVirtualLoading(true);
    try {
      await startVirtualContest(slug);
      // Clear any stale localStorage data so Arena gets a fresh timer
      localStorage.removeItem(`virtual_start_${slug}`);
      if (contest && contest.problems) {
        const languagesList = ['python', 'cpp', 'java', 'javascript'];
        contest.problems.forEach((p) => {
          languagesList.forEach((lang) => {
            localStorage.removeItem(`contest_draft_${slug}_${p.slug}_${lang}`);
          });
        });
      }
      navigate(`/contests/${slug}/arena?virtual=true`);
    } catch (err) {
      // startVirtualContest may return 400 if already started — still allow entry
      navigate(`/contests/${slug}/arena?virtual=true`);
    } finally {
      setVirtualLoading(false);
    }
  };


  // Loading state
  if (loading) {
    return (
      <div className="cd-root">
        <div className="cd-loading">
          <Loader2 size={24} className="cd-loading-spinner" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="cd-root">
        <div className="cd-error">
          <AlertCircle size={32} className="cd-error-icon" />
          <p className="cd-error-message">{error}</p>
          <button className="cd-error-btn" onClick={() => navigate('/contests')}>
            Back to Contests
          </button>
        </div>
      </div>
    );
  }

  if (!contest) return null;

  const timeInfo = getTimeLabel(contest.start_time, contest.end_time);
  const problems = contest.problems || [];

  // Status badge class
  let statusClass = 'cd-status cd-status--ended';
  if (timeInfo.status === 'upcoming') statusClass = 'cd-status cd-status--upcoming';
  else if (timeInfo.status === 'active') statusClass = 'cd-status cd-status--active';

  return (
    <div className="cd-root">
      <Navbar />
      {/* Page header — back button + title + status */}
      <header className="cd-header">
        <div className="cd-header-left">
          <button className="cd-back-btn" onClick={() => navigate('/contests')}>
            <ArrowLeft size={14} />
            <span>Contests</span>
          </button>
          <span className="cd-header-sep" />
          <h1 className="cd-title">{contest.title}</h1>
        </div>
        <div className={statusClass}>
          <Clock size={14} />
          <span>{timeInfo.label}</span>
        </div>
      </header>

      <div className="cd-body">
        <div className="cd-main">
          {/* Meta Cards */}
          <div className="cd-meta-grid">
            <div className="cd-meta-card">
              <div className="cd-meta-card-icon">
                <Calendar size={14} />
              </div>
              <span className="cd-meta-card-label">Start</span>
              <span className="cd-meta-card-value">{formatDateTime(contest.start_time)}</span>
            </div>
            <div className="cd-meta-card">
              <div className="cd-meta-card-icon">
                <Clock size={14} />
              </div>
              <span className="cd-meta-card-label">End</span>
              <span className="cd-meta-card-value">{formatDateTime(contest.end_time)}</span>
            </div>
            <div className="cd-meta-card">
              <div className="cd-meta-card-icon">
                <Users size={14} />
              </div>
              <span className="cd-meta-card-label">Registered</span>
              <span className="cd-meta-card-value">{contest.participant_count ?? 0} participants</span>
            </div>
          </div>

          {/* Tags */}
          <div className="cd-tags">
            {contest.is_rated && (
              <span className="cd-tag cd-tag--rated">
                <Shield size={14} />
                <span>Rated Contest</span>
              </span>
            )}
            {contest.eligible_class_tier && contest.eligible_class_tier !== 'all' && (
              <span className="cd-tag cd-tag--eligible">
                <GraduationCap size={14} />
                <span>{contest.eligible_class_tier.replace('_', ' ').toUpperCase()}</span>
              </span>
            )}
          </div>

          {/* Virtual Practice Box (for ended contests) */}
          {timeInfo.status === 'ended' && (
            <div className="cd-virtual-box">
              <div className="cd-virtual-box-content">
                <span className="cd-virtual-box-title">Virtual Practice Mode</span>
                <p className="cd-virtual-box-desc">
                  {sessionStatus.active
                    ? 'You have an active virtual simulation running. Resume the contest to continue coding.'
                    : 'This contest has ended. Start a virtual simulation to solve problems under simulated exam conditions.'}
                </p>
              </div>
              <button
                className="cd-btn cd-btn--primary"
                onClick={handleStartVirtual}
                disabled={virtualLoading}
              >
                {virtualLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trophy size={16} />
                )}
                <span>{sessionStatus.active ? 'Resume Virtual Contest' : 'Start Virtual Contest'}</span>
              </button>
            </div>
          )}


          {/* Tabs (for ended contests) */}
          {timeInfo.status === 'ended' && (
            <div className="cd-tabs">
              <button
                className={`cd-tab ${activeTab === 'problems' ? 'cd-tab--active' : ''}`}
                onClick={() => setActiveTab('problems')}
              >
                Problems
              </button>
              <button
                className={`cd-tab ${activeTab === 'standings' ? 'cd-tab--active' : ''}`}
                onClick={() => setActiveTab('standings')}
              >
                Standings
              </button>
            </div>
          )}

          {/* Description Card */}
          {contest.description && (
            <div className="cd-card">
              <h2 className="cd-card-title">Description</h2>
              <p className="cd-card-body">{contest.description}</p>
            </div>
          )}

          {/* Scoring Rules Card */}
          <div className="cd-card">
            <h2 className="cd-card-title">Scoring Rules ({contest.scoring_mode || 'ICPC'})</h2>
            <p className="cd-card-body">
              {contest.scoring_mode === 'codeforces' ? (
                <>
                  Time-based Penalty Engine (ACM-ICPC Style).
                  Penalty = (T_elapsed - T_start) + (Wrong attempts × 20 minutes) for accepted solutions.
                  Only fully correct submissions yield score points.
                </>
              ) : (
                <>
                  LeetCode score rules apply.
                  Speed and point allocation per problem.
                  Penalty of 5-10 minutes per wrong submission on eventually accepted problems.
                </>
              )}
            </p>
          </div>

          {/* Problems or Standings */}
          {activeTab === 'problems' ? (
            <div className="cd-problem-table">
              <div className="cd-problem-header">
                <span className="cd-problem-header-cell">#</span>
                <span className="cd-problem-header-cell">Title</span>
                <span className="cd-problem-header-cell cd-problem-header-cell--right">Points</span>
              </div>
              {problems.length === 0 ? (
                <div className="cd-empty">
                  <Hash size={32} />
                  <p className="cd-empty-text">Problems are only visible during active matches</p>
                </div>
              ) : (
                problems.map((problem, idx) => (
                  <div
                    key={problem.id || idx}
                    className={`cd-problem-row ${timeInfo.status === 'ended' ? 'cd-problem-row--clickable' : ''}`}
                    onClick={() => {
                      if (timeInfo.status === 'ended') {
                        navigate(`/practice/problems/${problem.slug}`);
                      }
                    }}
                  >
                    <span className="cd-problem-index">
                      {String.fromCharCode(65 + (problem.order_index ?? idx))}
                    </span>
                    <div className="cd-problem-cell">
                      <span className="cd-problem-title">{problem.title}</span>
                      {timeInfo.status === 'ended' && (
                        <ChevronRight size={14} className="cd-problem-arrow" />
                      )}
                    </div>
                    <span className="cd-problem-points">{problem.points ?? '—'}</span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="cd-leaderboard">
              {leaderboardLoading ? (
                <div className="cd-loading">
                  <Loader2 size={24} className="cd-loading-spinner" />
                </div>
              ) : (
                <Leaderboard
                  leaderboard={leaderboard.map((entry) => ({
                    username: entry.username,
                    score: entry.total_score,
                    penalty: entry.penalty_minutes,
                    rank: entry.rank,
                    elo_shift: entry.elo_change,
                  }))}
                  title="Contest Leaderboard"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContestDetailsPage;