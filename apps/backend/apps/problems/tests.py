from django.test import TestCase
from apps.problems.models import Problem, TestCase as ProblemTestCase
from apps.problems.sandbox import sanitize_error_message, run_code_in_sandbox, compare_outputs


class SandboxExecutionTests(TestCase):
    def test_compare_outputs_empty_equivalence(self):
        # Verify [] vs None vs null vs {} vs empty string are all treated as equivalent empty values
        self.assertTrue(compare_outputs("[]", "None"))
        self.assertTrue(compare_outputs("None", "[]"))
        self.assertTrue(compare_outputs("null", "None"))
        self.assertTrue(compare_outputs("{}", "None"))
        self.assertTrue(compare_outputs("", "None"))
        self.assertTrue(compare_outputs(None, "[]"))
        # Verify non-empty values do not match empty values
        self.assertFalse(compare_outputs("[1]", "None"))
        self.assertFalse(compare_outputs("None", "[1]"))

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
        verdict, results, compile_error = run_code_in_sandbox(code, "python", test_cases, 2000)
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
        verdict, results, compile_error = run_code_in_sandbox(code, "python", test_cases, 2000)
        self.assertEqual(verdict, "RE")
        self.assertFalse(results[0]["passed"])
        self.assertIn("ValueError: Invalid user argument", results[0]["error"])
        self.assertNotIn("/tmp/", results[0]["error"])

    def test_run_code_missing_java_compiler_returns_friendly_ce(self):
        import unittest.mock as mock
        import subprocess
        original_run = subprocess.run
        def mock_run(cmd, *args, **kwargs):
            if cmd[0] == "javac":
                raise FileNotFoundError()
            return original_run(cmd, *args, **kwargs)

        code = "class Solution { public int solve() { return 0; } }"
        test_cases = [
            ProblemTestCase(input="1", expected_output="0", is_sample=True, order_index=0)
        ]
        starter_code = "class Solution:\n    def solve(self) -> int:\n        pass"
        with mock.patch("subprocess.run", side_effect=mock_run):
            verdict, results, compile_error = run_code_in_sandbox(code, "java", test_cases, 2000, starter_code=starter_code)
        self.assertEqual(verdict, "CE")
        self.assertEqual(len(results), 0)
        self.assertIsNotNone(compile_error)
        self.assertIn("Java", compile_error)


from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from apps.problems.models import DailyBug, UserBugSolve
import datetime

User = get_user_model()

class DailyBugAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", email="testuser@example.com", password="password123")
        self.client.force_authenticate(user=self.user)
        
        self.bug = DailyBug.objects.create(
            title="Two Sum Bug Test",
            category="arrays",
            description="Fix the target typo.",
            starter_codes={
                "python": "class Solution:\n    def solve(self, nums: List[int], target: int) -> List[int]:\n        if nums[0] + nums[1] == target: return [0, 1]\n        return []"
            },
            examples=[
                {"input": "2,7\n9", "output": "[0, 1]"}
            ],
            test_cases_json=[
                {"input": "2,7\n9", "expected_output": "[0, 1]"}
            ],
            sample_input="2,7",
            expected_output="[0, 1]",
            line_budget=3,
            xp_reward=100,
            date=datetime.date.today(),
            is_active=True
        )

    def test_daily_bug_summary(self):
        url = reverse("daily_bug_summary")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["title"], self.bug.title)
        self.assertEqual(response.data["is_solved"], False)

    def test_daily_bug_detail(self):
        url = reverse("daily_bug_detail", kwargs={"bug_id": str(self.bug.id)})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["title"], self.bug.title)
        self.assertEqual(response.data["starter_codes"]["python"], self.bug.starter_codes["python"])

    def test_run_daily_bug_success(self):
        url = reverse("run_daily_bug", kwargs={"bug_id": str(self.bug.id)})
        data = {
            "code": "class Solution:\n    def solve(self, nums: List[int], target: int) -> List[int]:\n        return [0, 1]",
            "language": "python"
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("verdict", response.data)

    def test_submit_daily_bug_success(self):
        url = reverse("submit_daily_bug", kwargs={"bug_id": str(self.bug.id)})
        data = {
            "code": "class Solution:\n    def solve(self, nums: List[int], target: int) -> List[int]:\n        return [0, 1]",
            "language": "python"
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["passed"], True)
        
        # Verify solved record created
        self.assertTrue(UserBugSolve.objects.filter(user=self.user, bug=self.bug).exists())

