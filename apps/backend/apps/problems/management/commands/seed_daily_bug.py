import datetime
from django.core.management.base import BaseCommand
from apps.problems.models import DailyBug

class Command(BaseCommand):
    help = "Seed Daily Bug Bounty challenges"

    def handle(self, *args, **options):
        self.stdout.write("Seeding daily bugs...")

        bug_data = {
            "title": "Two Sum Bug",
            "category": "arrays",
            "description": "Fix the syntax/variable bug in the array summation code. The program is supposed to find two numbers that sum up to target and return their indices.",
            "starter_codes": {
                "python": "class Solution:\n    def solve(self, nums: List[int], target: int) -> List[int]:\n        # Bug: trg typo instead of target\n        for i in range(len(nums)):\n            for j in range(i + 1, len(nums)):\n                if nums[i] + nums[j] == trg:\n                    return [i, j]\n        return []",
                "javascript": "class Solution {\n    solve(nums, target) {\n        // Bug: trg typo instead of target\n        for (let i = 0; i < nums.length; i++) {\n            for (let j = i + 1; j < nums.length; j++) {\n                if (nums[i] + nums[j] === trg) {\n                    return [i, j];\n                }\n            }\n        }\n        return [];\n    }\n}",
                "cpp": "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> solve(vector<int>& nums, int target) {\n        // Bug: trg typo instead of target\n        for (int i = 0; i < nums.size(); i++) {\n            for (int j = i + 1; j < nums.size(); j++) {\n                if (nums[i] + nums[j] == trg) {\n                    return {i, j};\n                }\n            }\n        }\n        return {};\n    }\n};"
            },
            "examples": [
                {
                    "input": "2,7,11,15\n9",
                    "output": "[0, 1]",
                    "explanation": "Because nums[0] + nums[1] == 2 + 7 == 9."
                },
                {
                    "input": "3,2,4\n6",
                    "output": "[1, 2]",
                    "explanation": "Because nums[1] + nums[2] == 2 + 4 == 6."
                }
            ],
            "test_cases_json": [
                {"input": "2,7,11,15\n9", "expected_output": "[0, 1]"},
                {"input": "3,2,4\n6", "expected_output": "[1, 2]"},
                {"input": "3,3\n6", "expected_output": "[0, 1]"}
            ],
            "sample_input": "[2, 7, 11, 15], target = 9",
            "expected_output": "[0, 1]",
            "line_budget": 3,
            "xp_reward": 100,
            "time_limit_ms": 2000,
            "is_active": True
        }

        # Seed for today, yesterday, and tomorrow so we cover all test bases
        dates = [
            datetime.date.today() - datetime.timedelta(days=1),
            datetime.date.today(),
            datetime.date.today() + datetime.timedelta(days=1),
        ]

        for idx, date in enumerate(dates):
            bug, created = DailyBug.objects.update_or_create(
                date=date,
                defaults={
                    "title": f"{bug_data['title']} ({date.strftime('%A')})",
                    "category": bug_data["category"],
                    "description": bug_data["description"],
                    "starter_codes": bug_data["starter_codes"],
                    "examples": bug_data["examples"],
                    "test_cases_json": bug_data["test_cases_json"],
                    "sample_input": bug_data["sample_input"],
                    "expected_output": bug_data["expected_output"],
                    "line_budget": bug_data["line_budget"],
                    "xp_reward": bug_data["xp_reward"],
                    "time_limit_ms": bug_data["time_limit_ms"],
                    "is_active": bug_data["is_active"]
                }
            )
            self.stdout.write(f"Bug bounty seeded for {date}: {bug.title} (Created: {created})")

        self.stdout.write(self.style.SUCCESS("All daily bugs seeded successfully!"))
