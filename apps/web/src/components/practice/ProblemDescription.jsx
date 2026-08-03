// src/components/practice/ProblemDescription.jsx
// Presentational Text Container Panel — left column canvas pane.
// No internal network fetching or loading effects; all values via props.
import React, { useState } from 'react';
import './ProblemDescription.css';

// ─── Tab Identifiers ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'description', label: 'Description' },
  { id: 'submissions', label: 'Submissions History' },
];

// ─── Difficulty Styling Map ───────────────────────────────────────────────────
const DIFFICULTY_STYLES = {
  EASY:   'pdsc-badge pdsc-badge--easy',
  MEDIUM: 'pdsc-badge pdsc-badge--medium',
  HARD:   'pdsc-badge pdsc-badge--hard',
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

/**
 * SectionBlock — Reusable bordered text block for constraints, format specs.
 */
function SectionBlock({ title, content }) {
  if (!content) return null;
  return (
    <div className="pdsc-section">
      <h3 className="pdsc-section-title">{title}</h3>
      <div className="pdsc-section-body">
        {content.split('\n').map((line, i) => (
          <p key={i} className="pdsc-paragraph">
            {line || '\u00A0'}
          </p>
        ))}
      </div>
    </div>
  );
}

/**
 * SampleCase — Monospace display for sample input/output pairs.
 */
function SampleCase({ index, input, output }) {
  return (
    <div className="pdsc-sample">
      <h4 className="pdsc-sample-heading">Example {index + 1}</h4>
      <div className="pdsc-sample-grid">
        <div className="pdsc-sample-block">
          <span className="pdsc-sample-label">Input</span>
          <pre className="pdsc-sample-pre">{input}</pre>
        </div>
        <div className="pdsc-sample-block">
          <span className="pdsc-sample-label">Output</span>
          <pre className="pdsc-sample-pre">{output}</pre>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * ProblemDescription
 *
 * Props:
 *  - problem {Object} Full specification object:
 *    { title, difficulty, description, constraints, input_format, output_format,
 *      sample_input, sample_output, time_limit_ms, memory_limit_mb }
 */
export function ProblemDescription({
  problem,
  submissions = [],
  loadingSubmissions = false,
}) {
  const [activeTab, setActiveTab] = useState('description');
  const [expandedSubmissionId, setExpandedSubmissionId] = useState(null);

  if (!problem) return null;

  const difficulty = (problem.difficulty ?? '').toUpperCase();

  // Normalize sample testcases into paired arrays
  const sampleInputs = Array.isArray(problem.sample_input)
    ? problem.sample_input
    : problem.sample_input
      ? [problem.sample_input]
      : [];
  const sampleOutputs = Array.isArray(problem.sample_output)
    ? problem.sample_output
    : problem.sample_output
      ? [problem.sample_output]
      : [];

  return (
    <div className="pdsc-root" id="problem-description-panel">
      {/* ── Tab Selector Bar ─────────────────────────────────────────────── */}
      <div className="pdsc-tabs" role="tablist" aria-label="Problem view tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`pdsc-tab ${activeTab === tab.id ? 'pdsc-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            id={`tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Description View ─────────────────────────────────────────────── */}
      {activeTab === 'description' && (
        <div className="pdsc-content" role="tabpanel" aria-labelledby="tab-description">
          {/* Header Stats */}
          <div className="pdsc-header">
            <h2 className="pdsc-title">{problem.title}</h2>
            <div className="pdsc-meta">
              <span className={DIFFICULTY_STYLES[difficulty] ?? 'pdsc-badge'}>
                {difficulty}
              </span>
              {problem.time_limit_ms != null && (
                <span className="pdsc-limit">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <code>{problem.time_limit_ms}ms</code>
                </span>
              )}
              {problem.memory_limit_mb != null && (
                <span className="pdsc-limit">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                    <line x1="6" y1="6" x2="6.01" y2="6" />
                    <line x1="6" y1="18" x2="6.01" y2="18" />
                  </svg>
                  <code>{problem.memory_limit_mb}MB</code>
                </span>
              )}
            </div>
          </div>

          {/* Problem Statement */}
          <SectionBlock title="Problem Statement" content={problem.description} />

          {/* Constraints */}
          <SectionBlock title="Constraints" content={problem.constraints} />

          {/* Input Format */}
          <SectionBlock title="Input Format" content={problem.input_format} />

          {/* Output Format */}
          <SectionBlock title="Output Format" content={problem.output_format} />

          {/* Example Testcases */}
          {sampleInputs.length > 0 && (
            <div className="pdsc-examples">
              <h3 className="pdsc-section-title">Examples</h3>
              {sampleInputs.map((input, i) => (
                <SampleCase
                  key={i}
                  index={i}
                  input={input}
                  output={sampleOutputs[i] ?? ''}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Submissions View ─────────────────────────────────────────────── */}
      {activeTab === 'submissions' && (
        <div className="pdsc-content" role="tabpanel" aria-labelledby="tab-submissions">
          {loadingSubmissions ? (
            <div className="submissions-list">
              {[1, 2, 3].map((n) => (
                <div key={n} className="submission-skeleton-card">
                  <div className="submission-skeleton-line" style={{ height: '20px', width: '40%' }} />
                  <div className="submission-skeleton-line" style={{ height: '14px', width: '70%', marginTop: '8px' }} />
                  <div className="submission-skeleton-line" style={{ height: '30px', width: '100%', marginTop: '12px' }} />
                </div>
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <div className="pdsc-placeholder">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <p>No Submissions Yet</p>
              <span>Submit your code to see your performance log.</span>
            </div>
          ) : (
            <div className="submissions-list">
              {submissions.map((sub) => {
                const isExpanded = expandedSubmissionId === sub.id;
                const statusLower = (sub.verdict ?? 'wa').toLowerCase();
                const displayLang = sub.language === 'cpp' ? 'C++' : sub.language === 'javascript' ? 'JavaScript' : sub.language === 'java' ? 'Java' : 'Python';
                const formattedTime = new Date(sub.created_at).toLocaleString();
                
                return (
                  <div key={sub.id} className="submission-card">
                    <div className="submission-card-header">
                      <div className="submission-badge-group">
                        <span className={`submission-status-badge submission-status-badge--${statusLower}`}>
                          {sub.verdict}
                        </span>
                        <span className="submission-lang-badge">
                          {displayLang}
                        </span>
                      </div>
                      <span className="submission-time">{formattedTime}</span>
                    </div>
                    
                    <div className="submission-card-meta">
                      <span className="submission-testcases">
                        Passed {sub.test_cases_passed} / {sub.total_test_cases} test cases
                      </span>
                      <button
                        className="submission-view-code-btn"
                        onClick={() => setExpandedSubmissionId(isExpanded ? null : sub.id)}
                      >
                        {isExpanded ? 'Hide Code' : 'View Code'}
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginLeft: '4px' }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </div>
                    
                    {isExpanded && (
                      <pre className="submission-code-block">
                        <code>{sub.code}</code>
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
