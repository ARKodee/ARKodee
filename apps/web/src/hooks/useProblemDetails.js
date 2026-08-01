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

  // ─── Run Code ───────────────────────────────────────────────────────────────
  const runCode = async () => {
    setIsTerminalOpen(true);
    setIsRunning(true);
    setTerminalOutput('⏳ Running code against sample test cases...');
    try {
      const res = await runProblemCode(slug, code, selectedLanguage);
      if (res.verdict === 'AC') {
        let outputStr = '✅ Accepted on all sample cases!\n\n';
        res.results.forEach((r, idx) => {
          outputStr += `Case ${idx + 1}:\nInput:    ${r.input}\nOutput:   ${r.output}\nPassed:   Yes\n\n`;
        });
        setTerminalOutput(outputStr);
      } else {
        let outputStr = `❌ Verdict: ${res.verdict}\n\n`;
        res.results.forEach((r, idx) => {
          if (!r.passed) {
            outputStr += `Failed Case ${idx + 1}:\nInput:    ${r.input}\nExpected: ${r.expected}\nOutput:   ${r.output}\nError:    ${r.error ?? 'None'}\n\n`;
          }
        });
        setTerminalOutput(outputStr);
      }
    } catch (err) {
      setTerminalOutput(`❌ Execution Error: ${err.message ?? 'Unknown error occurred.'}`);
    } finally {
      setIsRunning(false);
    }
  };

  // ─── Submit Code ────────────────────────────────────────────────────────────
  const submitCode = async () => {
    setIsTerminalOpen(true);
    setIsSubmitting(true);
    setTerminalOutput('⏳ Submitting solution for evaluation...');
    try {
      const res = await submitProblemCode(slug, code, selectedLanguage);
      if (res.verdict === 'AC') {
        setTerminalOutput(`🎉 Accepted!\nPassed all ${res.total_count} test cases.`);
      } else {
        let outputStr = `❌ Verdict: ${res.verdict} (${res.passed_count}/${res.total_count} test cases passed)\n\n`;
        const failedResult = res.results.find(r => !r.passed);
        if (failedResult) {
          outputStr += `First Failed Case:\nInput:    ${failedResult.input}\nExpected: ${failedResult.expected}\nOutput:   ${failedResult.output}\nError:    ${failedResult.error ?? 'None'}\n`;
        }
        setTerminalOutput(outputStr);
      }
      // Refresh submission list to show the latest result
      fetchSubmissions();
    } catch (err) {
      setTerminalOutput(`❌ Submission Error: ${err.message ?? 'Unknown error occurred.'}`);
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
    runCode,
    submitCode,
    submissions,
    loadingSubmissions,
    refreshSubmissions: fetchSubmissions,
  };
}
