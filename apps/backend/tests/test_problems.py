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

    @mock.patch("apps.problems.management.commands.seed_problems.save_problem_templates")
    def test_seed_problems_success(self, mock_save_templates):
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

        # Verify mongo template save was called with correct data
        mock_save_templates.assert_called_once_with(
            problem.id,
            self.problem_data[0]["templates"]
        )


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

    @mock.patch("apps.problems.management.commands.seed_problems_csv.get_collection")
    @mock.patch("apps.problems.management.commands.seed_problems_csv.get_mongo_client")
    def test_seed_problems_csv_success(self, mock_get_client, mock_get_collection):
        # Mock MongoDB client and commands to prevent connection errors
        mock_client = mock.MagicMock()
        mock_get_client.return_value = mock_client
        mock_collection = mock.MagicMock()
        mock_get_collection.return_value = mock_collection
        
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
