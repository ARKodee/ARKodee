import json
import tempfile
import os
from unittest import mock
from django.core.management import call_command
from django.test import TestCase
from apps.problems.models import Problem, Tag, TestCase as DbTestCase

class SeedProblemsTests(TestCase):

    def setUp(self):
        # Create a temporary JSON file with mock problem data
        self.problem_data = [
            {
                "title": "Two Sum Test",
                "slug": "two-sum-test",
                "description": "Find two numbers that add up to target.",
                "difficulty": "Easy",
                "tags": ["array", "hash-table"],
                "constraints": "1 <= target <= 10^9",
                "input_format": "Array of integers and target",
                "output_format": "Indices of the two numbers",
                "sample_input": "[2,7,11,15]\n9",
                "sample_output": "[0,1]",
                "time_limit_ms": 1000,
                "memory_limit_mb": 128,
                "test_cases": [
                    {
                        "input": "[2,7,11,15]\n9",
                        "expected_output": "[0,1]",
                        "is_sample": True
                    },
                    {
                        "input": "[3,2,4]\n6",
                        "expected_output": "[1,2]",
                        "is_sample": False
                    }
                ],
                "templates": {
                    "python": "def twoSum(nums, target):\n    pass",
                    "cpp": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {}\n};"
                }
            }
        ]
        
        self.temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".json", mode="w", encoding="utf-8")
        json.dump(self.problem_data, self.temp_file)
        self.temp_file.close()

    def tearDown(self):
        if os.path.exists(self.temp_file.name):
            os.remove(self.temp_file.name)

    def test_seed_problems_success(self):
        # Verify initial database is empty
        self.assertEqual(Problem.objects.count(), 0)
        self.assertEqual(Tag.objects.count(), 0)
        self.assertEqual(DbTestCase.objects.count(), 0)

        # Call the management command
        call_command("seed_problems", self.temp_file.name)

        # Verify problem was created
        self.assertEqual(Problem.objects.count(), 1)
        problem = Problem.objects.get(slug="two-sum-test")
        self.assertEqual(problem.title, "Two Sum Test")
        self.assertEqual(problem.description, "Find two numbers that add up to target.")
        self.assertEqual(problem.difficulty, "easy")
        self.assertEqual(problem.time_limit_ms, 1000)
        self.assertEqual(problem.memory_limit_mb, 128)
        self.assertEqual(problem.status, "approved")

        # Verify tags were created and linked
        self.assertEqual(Tag.objects.count(), 2)
        tags = [tag.name for tag in problem.tags.all()]
        self.assertIn("array", tags)
        self.assertIn("hash-table", tags)

        # Verify test cases were created
        self.assertEqual(DbTestCase.objects.count(), 2)
        samples = problem.test_cases.filter(is_sample=True)
        hiddens = problem.test_cases.filter(is_sample=False)
        self.assertEqual(samples.count(), 1)
        self.assertEqual(hiddens.count(), 1)
        self.assertEqual(samples.first().input, "[2,7,11,15]\n9")
        self.assertEqual(samples.first().expected_output, "[0,1]")

        # Verify templates were saved to Postgres
        self.assertEqual(problem.templates, self.problem_data[0]["templates"])


class SeedProblemsCsvTests(TestCase):

    def setUp(self):
        # Create a temporary CSV file with mock problem data
        self.csv_headers = "task_id,question_id,difficulty,tags,problem_description,starter_code,estimated_date,prompt,completion,entry_point,test,input_output,query,response\n"
        self.csv_row = 'two-sum-test,1,Easy,"[\'Array\']","Test Description","def solve(): pass",2026-06-22,"prompt","completion","entry_point","test","[{\'input\': \'in\', \'output\': \'out\'}]","query","response"\n'
        
        self.temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".csv", mode="w", encoding="utf-8")
        self.temp_file.write(self.csv_headers)
        self.temp_file.write(self.csv_row)
        self.temp_file.close()

    def tearDown(self):
        if os.path.exists(self.temp_file.name):
            os.remove(self.temp_file.name)

    def test_seed_problems_csv_success(self):
        
        # Verify initial database is empty
        self.assertEqual(Problem.objects.count(), 0)
        self.assertEqual(Tag.objects.count(), 0)
        self.assertEqual(DbTestCase.objects.count(), 0)

        # Call the management command
        call_command("seed_problems_csv", self.temp_file.name, "--batch-size", "10")

        # Verify problem was created
        self.assertEqual(Problem.objects.count(), 1)
        problem = Problem.objects.get(slug="two-sum-test")
        self.assertEqual(problem.title, "Two Sum Test")
        self.assertEqual(problem.difficulty, "easy")

        # Verify tags were created
        self.assertEqual(Tag.objects.count(), 1)
        self.assertIn("Array", [tag.name for tag in problem.tags.all()])

        # Verify test cases were created
        self.assertEqual(DbTestCase.objects.count(), 1)
        tc = problem.test_cases.first()
        self.assertEqual(tc.input, "in")
        self.assertEqual(tc.expected_output, "out")
        self.assertTrue(tc.is_sample)

        # Verify templates were generated and saved to Postgres
        self.assertIn("python", problem.templates)
        self.assertEqual(problem.templates.get("python"), "class Solution:\n    def solve(self) -> int:\n        pass")


from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from apps.problems.models import Submission, UserProblemStats

User = get_user_model()

class ProblemsApiTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="testcoder",
            email="coder@test.com",
            password="testpassword123"
        )
        self.client.force_authenticate(user=self.user)
        
        self.problem = Problem.objects.create(
            title="Addition Problem",
            slug="addition-problem",
            description="Add A and B.",
            difficulty="easy",
            constraints="A, B >= 0",
            input_format="A B",
            output_format="A+B",
            sample_input="2 3",
            sample_output="5",
            status="approved"
        )
        
        self.sample_case = DbTestCase.objects.create(
            problem=self.problem,
            input="2 3",
            expected_output="5",
            is_sample=True,
            order_index=0
        )
        
        self.hidden_case = DbTestCase.objects.create(
            problem=self.problem,
            input="10 20",
            expected_output="30",
            is_sample=False,
            order_index=1
        )

    def test_problems_list_api(self):
        url = reverse("problems_list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Addition Problem")
        self.assertEqual(response.data[0]["difficulty"], "EASY")
        self.assertEqual(response.data[0]["is_solved"], False)
        
    def test_problem_detail_api(self):
        url = reverse("problem_detail", kwargs={"problem_slug": "addition-problem"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["title"], "Addition Problem")
        self.assertEqual(response.data["sample_input"], ["2 3"])
        self.assertEqual(response.data["sample_output"], ["5"])

    def test_run_code_api_python_ac(self):
        url = reverse("run_code", kwargs={"problem_slug": "addition-problem"})
        code = "import sys\nline = sys.stdin.read().strip()\na, b = map(int, line.split())\nprint(a + b)"
        response = self.client.post(url, {"code": code, "language": "python"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["verdict"], "AC")
        self.assertTrue(response.data["results"][0]["passed"])

    def test_run_code_api_python_wa(self):
        url = reverse("run_code", kwargs={"problem_slug": "addition-problem"})
        code = "import sys\nprint(999)"
        response = self.client.post(url, {"code": code, "language": "python"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["verdict"], "WA")
        self.assertFalse(response.data["results"][0]["passed"])

    def test_submit_code_api_ac(self):
        url = reverse("submit_code", kwargs={"problem_slug": "addition-problem"})
        code = "import sys\nline = sys.stdin.read().strip()\na, b = map(int, line.split())\nprint(a + b)"
        response = self.client.post(url, {"code": code, "language": "python"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["verdict"], "AC")
        self.assertEqual(response.data["passed_count"], 2)
        
        # Verify stats updated
        stats = UserProblemStats.objects.get(user=self.user, problem=self.problem)
        self.assertEqual(stats.status, "solved")
        self.assertEqual(stats.attempts_count, 1)
        
        # Verify calendar has the submission
        cal_url = reverse("submission_calendar")
        cal_resp = self.client.get(cal_url)
        self.assertEqual(cal_resp.status_code, 200)
        self.assertTrue(len(cal_resp.data) > 0)

    def test_problem_submissions_api(self):
        # Create a submission for testing
        Submission.objects.create(
            user=self.user,
            problem=self.problem,
            language="python",
            code="print(5)",
            verdict="AC",
            test_cases_passed=2,
            total_test_cases=2
        )
        url = reverse("problem_submissions", kwargs={"problem_slug": "addition-problem"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["verdict"], "AC")
        self.assertEqual(response.data[0]["language"], "python")
        self.assertEqual(response.data[0]["code"], "print(5)")
        self.assertEqual(response.data[0]["test_cases_passed"], 2)


