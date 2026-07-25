import json
import os
from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify
from django.db import transaction
from apps.problems.models import Problem, Tag, TestCase
from apps.problems.template_helpers import save_problem_templates

class Command(BaseCommand):
    help = "Seed problems, test cases, and code templates into PostgreSQL from a JSON file"

    def add_arguments(self, parser):
        parser.add_argument("json_file", type=str, help="Path to the JSON file containing the problem set")

    def handle(self, *args, **options):
        json_file_path = options["json_file"]

        if not os.path.exists(json_file_path):
            raise CommandError(f"File not found: {json_file_path}")

        self.stdout.write(self.style.NOTICE(f"Loading problems from {json_file_path}..."))

        try:
            with open(json_file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            raise CommandError(f"Failed to parse JSON file: {e}")

        # Standardize data to a list
        if isinstance(data, dict):
            # If the JSON is a wrapper like {"problems": [...]}
            problems = data.get("problems", [])
        elif isinstance(data, list):
            problems = data
        else:
            raise CommandError("JSON file must be a list of problems or a dictionary containing a 'problems' list.")

        total_problems = len(problems)
        self.stdout.write(self.style.NOTICE(f"Found {total_problems} problems to process."))

        success_count = 0
        error_count = 0

        for idx, item in enumerate(problems, 1):
            try:
                title = item.get("title")
                if not title:
                    self.stdout.write(self.style.WARNING(f"Skipping problem #{idx}: Missing 'title'"))
                    error_count += 1
                    continue

                slug = item.get("slug") or slugify(title)
                description = item.get("description", "")
                difficulty = item.get("difficulty", "easy").lower()
                if difficulty not in ["easy", "medium", "hard"]:
                    difficulty = "easy"

                constraints = item.get("constraints", "")
                input_format = item.get("input_format", "")
                output_format = item.get("output_format", "")
                sample_input = item.get("sample_input", "")
                sample_output = item.get("sample_output", "")
                time_limit_ms = item.get("time_limit_ms", 2000)
                memory_limit_mb = item.get("memory_limit_mb", 256)

                with transaction.atomic():
                    # Create or update Problem
                    problem, created = Problem.objects.update_or_create(
                        slug=slug,
                        defaults={
                            "title": title,
                            "description": description,
                            "difficulty": difficulty,
                            "constraints": constraints,
                            "input_format": input_format,
                            "output_format": output_format,
                            "sample_input": sample_input,
                            "sample_output": sample_output,
                            "time_limit_ms": time_limit_ms,
                            "memory_limit_mb": memory_limit_mb,
                            "status": "approved", # Auto-approve seeded problems
                        }
                    )

                    # Handle tags
                    tags_data = item.get("tags", [])
                    if isinstance(tags_data, str):
                        tags_data = [t.strip() for t in tags_data.split(",") if t.strip()]
                    
                    # Clear existing tags and add new ones
                    problem.tags.clear()
                    for tag_name in tags_data:
                        tag_name = tag_name.strip()
                        if tag_name:
                            tag, _ = Tag.objects.get_or_create(name=tag_name)
                            problem.tags.add(tag)

                    # Handle test cases
                    # First, clear existing test cases for clean seeding
                    TestCase.objects.filter(problem=problem).delete()

                    test_cases_data = item.get("test_cases", [])
                    # Support both standard list and sample/hidden structure
                    if isinstance(test_cases_data, dict):
                        # e.g., {"sample": [{"input": "...", "output": "..."}], "hidden": [...]}
                        samples = test_cases_data.get("sample", [])
                        hidden = test_cases_data.get("hidden", [])
                        
                        order = 0
                        for tc in samples:
                            TestCase.objects.create(
                                problem=problem,
                                input=tc.get("input", ""),
                                expected_output=tc.get("expected_output") or tc.get("output", ""),
                                is_sample=True,
                                order_index=order
                            )
                            order += 1
                        for tc in hidden:
                            TestCase.objects.create(
                                problem=problem,
                                input=tc.get("input", ""),
                                expected_output=tc.get("expected_output") or tc.get("output", ""),
                                is_sample=False,
                                order_index=order
                            )
                            order += 1
                    else:
                        # Simple list of test case dictionaries
                        for order, tc in enumerate(test_cases_data):
                            TestCase.objects.create(
                                problem=problem,
                                input=tc.get("input", ""),
                                expected_output=tc.get("expected_output") or tc.get("output", ""),
                                is_sample=tc.get("is_sample", False),
                                order_index=order
                            )

                # Save templates to PostgreSQL if we have any
                templates = item.get("templates", {})
                if templates:
                    save_problem_templates(problem.id, templates)

                action_str = "Created" if created else "Updated"
                self.stdout.write(self.style.SUCCESS(f"[{idx}/{total_problems}] {action_str} problem '{title}'"))
                success_count += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error seeding problem #{idx}: {e}"))
                error_count += 1

        self.stdout.write(self.style.SUCCESS(f"Seeding completed. Success: {success_count}, Errors: {error_count}"))
