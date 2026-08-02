import { useState, useEffect, useRef } from 'react';
import { getProblemDetails, runProblemCode, submitProblemCode, getProblemSubmissions } from '../lib/problems';

/**
 * Language-specific default boilerplate templates.
 * Used as fallback when the API response has no starter_code or boilerplate field.
 */
const DEFAULT_TEMPLATES = {
  python: `class Solution:\n    def solve(self, nums: List[int], target: int) -> List[int]:\n        # Write your solution here\n        pass\n`,
  cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> solve(vector<int>& nums, int target) {\n        // Write your solution here\n        return {};\n    }\n};\n`,
  java: `import java.util.*;\n\nclass Solution {\n    public int[] solve(int[] nums, int target) {\n        // Write your solution here\n        return new int[]{};\n    }\n}\n`,
  javascript: `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar solve = function(nums, target) {\n    // Write your solution here\n};\n`,
};

/**
 * useProblemDetails — The core operational brain for the Problem Workspace feature.
 */
export function useProblemDetails(slug) {
  // ─── Data State ──────────────────────────────────────────────────────────────
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [code, setCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    return localStorage.getItem('preferredLanguage') || 'python';
  });
  
  // ─── Submissions History State ───────────────────────────────────────────────
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const fetchSubmissions = async () => {
    if (!slug) return;
    setLoadingSubmissions(true);
    try {
      const data = await getProblemSubmissions(slug);
      setSubmissions(data ?? []);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // ─── Persist language preference ──────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('preferredLanguage', selectedLanguage);
  }, [selectedLanguage]);

  // ─── Run & Submit States ─────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState('');
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  // ─── Primary Lifecycle Effect ────────────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchDetails = async () => {
      try {
        const data = await getProblemDetails(slug);

        if (!isMounted) return;

        setProblem(data);
        // Pre-fetch submissions log
        fetchSubmissions();
      } catch (err) {
        if (!isMounted) return;
        setError(err.message ?? 'Failed to load problem details.');
        setProblem(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Track which languages have been initialized during this workspace session
  const initializedLangs = useRef(new Set());

  // ─── Initialize Editor Code from Draft, Submissions, or Boilerplate ───────────
  useEffect(() => {
    if (!problem) return;
    
    const draftKey = `code_draft_${problem.slug}_${selectedLanguage}`;
    const savedDraft = localStorage.getItem(draftKey);
    
    // 1. If we have a saved local draft, load it immediately
    if (savedDraft) {
      setCode(savedDraft);
      initializedLangs.current.add(selectedLanguage);
      return;
    }
    
    // If we've already initialized this language in this session, do not overwrite state
    if (initializedLangs.current.has(selectedLanguage)) {
      return;
    }
    
    // 2. Try loading from their most recent submission in this language
    const lastSubForLang = submissions.find(
      (sub) => sub.language === selectedLanguage
    );
    if (lastSubForLang && lastSubForLang.code) {
      setCode(lastSubForLang.code);
      initializedLangs.current.add(selectedLanguage);
      return;
    }
    
    // If submissions are still loading, wait so we don't prematurely fall back to template
    if (loadingSubmissions) {
      return;
    }
    
    // 3. Fallback: Load starter boilerplate template
    const template =
      problem?.boilerplate?.[selectedLanguage] ??
      problem?.starter_code ??
      DEFAULT_TEMPLATES[selectedLanguage] ??
      '';
    setCode(template);
    initializedLangs.current.add(selectedLanguage);
  }, [selectedLanguage, problem, submissions, loadingSubmissions]);

  // ─── Auto-save code draft to localStorage as user types ────────────────────────
  useEffect(() => {
    if (!problem || !code) return;
    
    const draftKey = `code_draft_${problem.slug}_${selectedLanguage}`;
    localStorage.setItem(draftKey, code);
  }, [code, selectedLanguage, problem]);

  const [testCaseResults, setTestCaseResults] = useState([]);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [visibleTestCases, setVisibleTestCases] = useState([]);
  const [activeTerminalTab, setActiveTerminalTab] = useState('testcases'); // 'testcases' | 'submission'

  // Initialize visible test cases when problem loads, merging default & localStorage cases
  useEffect(() => {
    if (!problem || !slug) return;
    
    let baseCases = [];
    if (problem.sample_test_cases && problem.sample_test_cases.length > 0) {
      baseCases = problem.sample_test_cases.map((tc, idx) => ({
        id: tc.id || `sample-${idx}`,
        input: tc.input,
        expected_output: tc.expected_output || tc.expected || '',
        label: tc.label || `Case ${idx + 1}`,
      }));
    } else if (problem.sample_input && problem.sample_input.length > 0) {
      baseCases = problem.sample_input.map((inp, idx) => ({
        id: `sample-${idx}`,
        input: inp,
        expected_output: problem.sample_output?.[idx] || '',
        label: `Case ${idx + 1}`,
      }));
    }

    try {
      const savedRaw = localStorage.getItem(`added_testcases_${slug}`);
      if (savedRaw) {
        const savedCases = JSON.parse(savedRaw);
        if (Array.isArray(savedCases)) {
          // Merge saved cases ensuring no duplicate inputs
          savedCases.forEach((sc) => {
            if (!baseCases.some(b => b.input === sc.input)) {
              baseCases.push({
                ...sc,
                label: `Case ${baseCases.length + 1}`,
              });
            }
          });
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved testcases from localStorage', e);
    }

    setVisibleTestCases(baseCases);
  }, [problem, slug]);

  const addFailedCaseToVisible = (failedCase) => {
    if (!failedCase || !failedCase.input) return;
    const exists = visibleTestCases.some(tc => tc.input === failedCase.input);
    if (!exists) {
      const newTc = {
        id: `added-${Date.now()}`,
        input: failedCase.input,
        expected_output: failedCase.expected || failedCase.expected_output || '',
        label: `Case ${visibleTestCases.length + 1}`,
        is_user_added: true,
      };
      const updatedList = [...visibleTestCases, newTc];
      setVisibleTestCases(updatedList);

      // Save user added cases to localStorage
      try {
        const addedOnly = updatedList.filter(tc => tc.is_user_added);
        localStorage.setItem(`added_testcases_${slug}`, JSON.stringify(addedOnly));
      } catch (e) {
        console.warn('Failed to save testcase to localStorage', e);
      }
    }
    setActiveTerminalTab('testcases');
    setIsTerminalOpen(true);
  };

  // Helper to convert shorthand codes to clear human-readable status titles
  const getFullVerdictTitle = (v) => {
    if (!v) return 'Result: Evaluation Error';
    if (v === 'AC' || v === 'Accepted') return 'Result: Accepted';
    if (v === 'WA' || v.startsWith('WA')) return 'Result: Wrong Answer';
    if (v === 'RE' || v.startsWith('RE')) return 'Result: Runtime Error';
    if (v === 'TLE' || v.startsWith('TLE')) return 'Result: Time Limit Exceeded';
    if (v === 'CE' || v.startsWith('CE')) return 'Result: Compilation Error';
    return `Result: ${v}`;
  };

  // ─── Run Code ───────────────────────────────────────────────────────────────
  const runCode = async () => {
    setIsTerminalOpen(true);
    setActiveTerminalTab('testcases');
    setIsRunning(true);
    setTerminalOutput('Evaluating solution against test cases...');
    setTestCaseResults([]);
    try {
      const res = await runProblemCode(slug, code, selectedLanguage, visibleTestCases);
      setTestCaseResults(res.results || []);
      if (res.verdict === 'CE' || res.compile_error) {
        setTerminalOutput(`Result: Compilation Error\n\n${res.compile_error || 'Compilation Error occurred.'}`);
      } else if (res.verdict === 'AC') {
        setTerminalOutput('Result: Accepted');
      } else {
        const fullTitle = getFullVerdictTitle(res.verdict);
        setTerminalOutput(fullTitle);
      }
    } catch (err) {
      setTerminalOutput(`Result: Execution Error\n${err.message ?? 'Unknown error occurred.'}`);
    } finally {
      setIsRunning(false);
    }
  };

  // ─── Submit Code ────────────────────────────────────────────────────────────
  const submitCode = async () => {
    setIsTerminalOpen(true);
    setActiveTerminalTab('submission');
    setIsSubmitting(true);
    setSubmissionResult(null);
    setTerminalOutput('Submitting solution for complete evaluation...');
    try {
      const res = await submitProblemCode(slug, code, selectedLanguage);
      setSubmissionResult(res);
      if (res.verdict === 'CE' || res.compile_error) {
        setTerminalOutput(`Result: Compilation Error\n\n${res.compile_error || 'Compilation Error occurred.'}`);
      } else if (res.verdict === 'AC') {
        setTerminalOutput(`Result: Accepted\nPassed all ${res.total_count} test cases.`);
      } else {
        const fullTitle = getFullVerdictTitle(res.verdict);
        setTerminalOutput(`${fullTitle} (${res.passed_count}/${res.total_count} test cases passed)`);
      }
      // Refresh submission list to show the latest result
      fetchSubmissions();
    } catch (err) {
      setTerminalOutput(`Result: Submission Error\n${err.message ?? 'Unknown error occurred.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Packaged Contract ─────────────────────────────────────────────────────
  return {
    problem,
    loading,
    error,
    code,
    setCode,
    selectedLanguage,
    setSelectedLanguage,
    isRunning,
    isSubmitting,
    terminalOutput,
    setTerminalOutput,
    isTerminalOpen,
    setIsTerminalOpen,
    activeTerminalTab,
    setActiveTerminalTab,
    testCaseResults,
    submissionResult,
    visibleTestCases,
    addFailedCaseToVisible,
    runCode,
    submitCode,
    submissions,
    loadingSubmissions,
    refreshSubmissions: fetchSubmissions,
  };
}
