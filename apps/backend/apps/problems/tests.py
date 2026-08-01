from django.test import TestCase
from apps.problems.models import Problem, TestCase as ProblemTestCase
from apps.problems.sandbox import sanitize_error_message, run_code_in_sandbox


class SandboxExecutionTests(TestCase):
    def test_sanitize_error_message_strips_temp_paths(self):
        raw_err = (
            'Traceback (most recent call last):\n'
            '  File "/tmp/tmp1234abcd/solution.py", line 12, in <module>\n'
            '    run_driver()\n'
            '  File "/tmp/tmp1234abcd/solution.py", line 5, in twoSum\n'
            '    return 1 / 0\n'
            'ZeroDivisionError: division by zero'
        )
        cleaned = sanitize_error_message(raw_err, "python", wrapper_line_count=1)
        self.assertNotIn("/tmp/tmp1234abcd", cleaned)
        self.assertNotIn("run_driver()", cleaned)
        self.assertIn("ZeroDivisionError: division by zero", cleaned)

    def test_run_code_python_accepted(self):
        code = (
            "class Solution:\n"
            "    def twoSum(self, nums: List[int], target: int) -> List[int]:\n"
            "        return [0, 1]\n"
        )
        test_cases = [
            ProblemTestCase(input="nums = [2, 7, 11, 15], target = 9", expected_output="[0, 1]", is_sample=True, order_index=0)
        ]
        verdict, results = run_code_in_sandbox(code, "python", test_cases, 2000)
        self.assertEqual(verdict, "AC")
        self.assertTrue(results[0]["passed"])

    def test_run_code_python_runtime_error_sanitized(self):
        code = (
            "class Solution:\n"
            "    def twoSum(self, nums: List[int], target: int) -> List[int]:\n"
            "        raise ValueError('Invalid user argument')\n"
        )
        test_cases = [
            ProblemTestCase(input="nums = [2, 7, 11, 15], target = 9", expected_output="[0, 1]", is_sample=True, order_index=0)
        ]
        verdict, results = run_code_in_sandbox(code, "python", test_cases, 2000)
        self.assertEqual(verdict, "RE")
        self.assertFalse(results[0]["passed"])
        self.assertIn("ValueError: Invalid user argument", results[0]["error"])
        self.assertNotIn("/tmp/", results[0]["error"])
