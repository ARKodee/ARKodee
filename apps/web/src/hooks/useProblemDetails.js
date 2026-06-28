// src/hooks/useProblemDetails.js
// State Engine Brain — isolates workspace side-effects entirely out of presentation files.
import { useState, useEffect } from 'react';
import { getProblemDetails } from '../lib/problems';

/**
 * Language-specific default boilerplate templates.
 * Used as fallback when the API response has no starter_code or boilerplate field.
 */
const DEFAULT_TEMPLATES = {
  python: `# Write your solution here\n\ndef solve():\n    pass\n\nif __name__ == "__main__":\n    solve()\n`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n`,
  java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n`,
  javascript: `// Write your solution here\n\nfunction solve() {\n\n}\n\nsolve();\n`,
};

/**
 * useProblemDetails — The core operational brain for the Problem Workspace feature.
 *
 * Manages:
 *  - Problem detail data + loading/error states
 *  - Solution code string (editable by the user)
 *  - Active language selection for the editor
 *
 * @param {string} slug - Unique challenge slug from the URL route.
 * @returns {Object} Structured contract: { problem, loading, error, code, setCode, selectedLanguage, setSelectedLanguage }
 */
export function useProblemDetails(slug) {
  // ─── Data State ──────────────────────────────────────────────────────────────
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [code, setCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('python');

  // ─── Primary Lifecycle Effect ────────────────────────────────────────────────
  // Observes changes to the slug. When invoked, fetches the full problem
  // specification, maps properties into state handles, and cleans up old
  // memory buffers via the isMounted flag.
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

        // Resolve initial code: prefer backend boilerplate → starter_code → language default
        const initialCode =
          data?.boilerplate?.[selectedLanguage] ??
          data?.starter_code ??
          DEFAULT_TEMPLATES[selectedLanguage] ??
          '';
        setCode(initialCode);
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

  // ─── Packaged Contract ─────────────────────────────────────────────────────
  return {
    problem,
    loading,
    error,
    code,
    setCode,
    selectedLanguage,
    setSelectedLanguage,
  };
}
