// src/pages/DebugArenaPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { InteractiveEditor } from '../components/practice/InteractiveEditor';
import { getBugDetails, runBugCode, submitBugCode } from '../lib/bugs';

export function DebugArenaPage() {
  const navigate = useNavigate();
  const { bugId } = useParams();

  // State
  const [language, setLanguage] = useState('python');
  const [bugData, setBugData] = useState(null);
  const [codes, setCodes] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [failedReason, setFailedReason] = useState('');

  // Fetch bug data via lib/bugs.js
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    getBugDetails(bugId)
      .then((data) => {
        if (isMounted) {
          setBugData(data);
          if (data?.starter_codes) {
            setCodes(data.starter_codes);
          }
          setTerminalOutput(
            `Console initialized. Ready to execute visible test cases.\nTarget restriction: Max ${data?.line_budget || 3} lines modified.`
          );
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load bug details:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load bug telemetry.');
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [bugId]);

  const currentCode = codes[language] ?? bugData?.starter_codes?.[language] ?? '';

  const handleCodeChange = (newVal) => {
    setCodes((prev) => ({
      ...prev,
      [language]: newVal,
    }));
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  // Calculate modified line count compared to starter code from API data
  const getModifiedLineCount = () => {
    const starterLines = (bugData?.starter_codes?.[language] || '').split('\n');
    const currentLines = (currentCode || '').split('\n');
    let diff = 0;
    const maxLen = Math.max(starterLines.length, currentLines.length);
    for (let i = 0; i < maxLen; i++) {
      if (starterLines[i] !== currentLines[i]) {
        diff++;
      }
    }
    return diff;
  };

  // Run Code via lib/bugs.js API wrapper
  const handleRunCode = async () => {
    setIsRunning(true);
    setIsTerminalOpen(true);
    setTerminalOutput('[EXEC] Compiling & running solution code...');

    try {
      const res = await runBugCode(bugId, currentCode, language);
      setIsRunning(false);
      const mods = getModifiedLineCount();
      const maxBudget = bugData?.line_budget || 3;
      const outputText = res.output || (res.results ? JSON.stringify(res.results, null, 2) : 'Execution complete.');
      setTerminalOutput(`${outputText}\n[LINE BUDGET] Lines modified: ${mods}/${maxBudget}.`);
    } catch (err) {
      setIsRunning(false);
      setTerminalOutput(`[EXEC ERROR] ${err.message || 'Failed to execute code.'}`);
    }
  };

  // Submit Code via lib/bugs.js API wrapper
  const handleSubmitCode = async () => {
    setIsSubmitting(true);
    setIsTerminalOpen(true);
    setTerminalOutput('[SUBMIT] Running full validation suite...');

    const mods = getModifiedLineCount();
    const maxBudget = bugData?.line_budget || 3;
    if (mods > maxBudget) {
      setIsSubmitting(false);
      const limitError = `Line Edit Restriction Violated! You modified ${mods} lines of code, but the daily bounty maximum allowed budget is ${maxBudget} lines.`;
      setFailedReason(limitError);
      setShowFailedModal(true);
      setTerminalOutput(`[SUBMIT FAILED] Line edit limit exceeded (${mods} modified > ${maxBudget} max allowed).`);
      return;
    }

    try {
      const res = await submitBugCode(bugId, currentCode, language);
      setIsSubmitting(false);
      if (res.passed) {
        setTerminalOutput(res.output || 'All test cases passed!');
        setShowSuccessModal(true);
      } else {
        setFailedReason(res.error || res.output || 'Validation failed on test cases.');
        setTerminalOutput(res.output || res.error || 'Submission failed.');
        setShowFailedModal(true);
      }
    } catch (err) {
      setIsSubmitting(false);
      setFailedReason(err.message || 'Submission failed.');
      setShowFailedModal(true);
    }
  };

  if (isLoading) {
    return (
      <div
        className="w-screen h-screen flex items-center justify-center font-mono select-none"
        style={{ background: '#0a0a0c', color: '#e8e8f0' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-xs text-[#8888a0]">Loading Bug Arena telemetry...</span>
        </div>
      </div>
    );
  }

  if (error || !bugData) {
    return (
      <div
        className="w-screen h-screen flex flex-col items-center justify-center font-mono select-none p-6 text-center"
        style={{ background: '#0a0a0c', color: '#e8e8f0' }}
      >
        <div className="bg-[#111113] border border-[#1f1f24] rounded-xl p-8 max-w-md w-full space-y-4">
          <div className="text-amber-400 text-2xl font-bold">⚠️ Telemetry Error</div>
          <p className="text-xs text-[#8888a0]">{error || 'Bug Bounty telemetry record not found.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="py-2.5 px-4 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-sans font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const {
    bug_id,
    title,
    category,
    description,
    examples = [],
    line_budget = 3,
  } = bugData;

  const modsCount = getModifiedLineCount();

  return (
    <div
      className="w-screen h-screen flex flex-col font-mono select-none overflow-hidden"
      style={{ background: '#0a0a0c', color: '#e8e8f0' }}
    >
      {/* 1. Header Toolbar */}
      <header
        className="flex-shrink-0 px-5 py-3 flex items-center justify-between z-20 shadow-sm"
        style={{
          background: '#111113',
          borderBottom: '1px solid #1f1f24',
        }}
      >
        {/* Left: Back Button & Telemetry */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 rounded bg-[#16161a] border border-[#1f1f24] hover:border-[#2a2a32] text-[#8888a0] hover:text-[#e8e8f0] transition-colors cursor-pointer"
            title="Return to Dashboard"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>

          <div className="flex items-center gap-2.5">
            {bug_id && (
              <span className="text-xs font-mono font-bold text-[#e8e8f0] bg-[#16161a] border border-[#1f1f24] px-2.5 py-0.5 rounded">
                #{bug_id}
              </span>
            )}
            <h1 className="text-sm font-bold font-sans tracking-tight text-[#e8e8f0]">
              {title}
            </h1>
            {category && (
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {category}
              </span>
            )}
          </div>
        </div>

        {/* Right: Line Counter & Language Dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#16161a] border border-[#1f1f24] px-3 py-1 rounded text-xs font-mono">
            <span className="text-[#555568] uppercase font-semibold text-[10px] tracking-wider">Edits:</span>
            <span className={`font-bold ${modsCount > line_budget ? 'text-[#fb7185]' : 'text-[#fbbf24]'}`}>
              {modsCount}/{line_budget} Lines
            </span>
          </div>

          <div className="relative">
            <select
              value={language}
              onChange={handleLanguageChange}
              className="bg-[#16161a] text-[#e8e8f0] border border-[#1f1f24] rounded px-3 py-1 text-xs font-mono font-semibold focus:outline-none cursor-pointer pr-7 appearance-none"
            >
              <option value="python">Python 3</option>
              <option value="javascript">JavaScript</option>
              <option value="cpp">C++</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#555568]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Workspace Split-View Layout */}
      <div className="flex-1 flex overflow-hidden w-full relative">
        {/* Left Side Pane: Problem Description (40% width) */}
        <div
          className="w-5/12 lg:w-4/12 border-r border-[#1f1f24] p-5 space-y-4 overflow-y-auto"
          style={{ background: '#111113' }}
        >
          {/* Restriction Alert Banner */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3.5 flex items-start gap-3">
            <span className="text-amber-400 text-sm select-none">⚠️</span>
            <div className="space-y-0.5 text-xs font-sans">
              <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[10px] font-mono">
                Debugging Constraint
              </h4>
              <p className="text-[#8888a0] text-xs leading-relaxed">
                Modify <span className="font-bold text-amber-400 font-mono">no more than {line_budget} lines</span> to pass validation.
              </p>
            </div>
          </div>

          {/* Problem Overview */}
          <div className="bg-[#16161a] border border-[#1f1f24] rounded-lg p-4 space-y-2.5">
            <h2 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#8888a0]">
              Problem Overview
            </h2>
            <p className="text-xs font-sans text-[#8888a0] leading-relaxed">
              {description}
            </p>
          </div>

          {/* Sample Inputs / Outputs */}
          {examples.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#8888a0]">
                Examples
              </h2>

              {examples.map((ex, idx) => (
                <div key={ex.id || idx} className="bg-[#16161a] border border-[#1f1f24] rounded-lg p-3.5 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between border-b border-[#1f1f24] pb-1.5 mb-1">
                    <span className="font-bold text-[#e8e8f0]">Example {idx + 1}</span>
                    <span className="text-[9px] font-bold text-[#34d399] uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      Match Case
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#555568] uppercase text-[10px] tracking-wider">Input:</span>
                    <code className="text-[#e8e8f0]">{ex.input}</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#555568] uppercase text-[10px] tracking-wider">Output:</span>
                    <code className="text-[#34d399] font-bold">{ex.output}</code>
                  </div>
                  {ex.explanation && (
                    <p className="text-[11px] font-sans text-[#8888a0] pt-1 leading-relaxed">
                      {ex.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side Pane: InteractiveEditor Component (60% width) */}
        <div className="w-7/12 lg:w-8/12 flex flex-col bg-[#0a0a0c] overflow-hidden relative">
          <InteractiveEditor
            code={currentCode}
            setCode={handleCodeChange}
            selectedLanguage={language}
            isRunning={isRunning}
            isSubmitting={isSubmitting}
            terminalOutput={terminalOutput}
            isTerminalOpen={isTerminalOpen}
            setIsTerminalOpen={setIsTerminalOpen}
            onRun={handleRunCode}
            onSubmit={handleSubmitCode}
          />
        </div>
      </div>

      {/* 3. SUCCESS MODAL ("Bug Squashed!") */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-emerald-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-5 font-mono">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-[#34d399] rounded-full flex items-center justify-center mx-auto text-xl shadow-sm">
                🎉
              </div>
              <h3 className="text-lg font-bold font-sans text-[#e8e8f0]">Bug Squashed!</h3>
              <p className="text-xs font-sans text-[#8888a0]">
                Boundary bug resolved within the {line_budget}-line edit constraint!
              </p>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-2.5 px-4 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-sans font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* 4. FAILED MODAL ("Fix Failed") */}
      {showFailedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-rose-500/30 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-5 font-mono">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto text-xl shadow-sm">
                ❌
              </div>
              <h3 className="text-lg font-bold font-sans text-[#e8e8f0]">Fix Failed</h3>
              <p className="text-xs font-sans text-[#8888a0]">
                Your submission failed validation checks.
              </p>
            </div>

            <div className="bg-[#16161a] border border-[#1f1f24] rounded-lg p-3.5 font-mono text-xs text-rose-400 leading-relaxed max-h-32 overflow-y-auto">
              {failedReason}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowFailedModal(false);
                  setIsTerminalOpen(true);
                }}
                className="flex-1 py-2.5 px-4 bg-[#16161a] border border-[#1f1f24] text-[#e8e8f0] font-sans font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Inspect Terminal
              </button>
              <button
                onClick={() => setShowFailedModal(false)}
                className="flex-1 py-2.5 px-4 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-sans font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DebugArenaPage;
