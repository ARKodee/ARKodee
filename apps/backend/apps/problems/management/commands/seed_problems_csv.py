import csv
import ast
import sys
import uuid
from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify
from django.db import transaction
from apps.problems.models import Problem, Tag, TestCase
from apps.problems.mongo_models import save_problem_templates
from utils.mongo import get_collection, get_mongo_client

# Increase field limit to handle huge fields in CSV
csv.field_size_limit(sys.maxsize)

class Command(BaseCommand):
    help = "Seed problems and test cases from output.csv into PostgreSQL and starter codes into MongoDB"

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_file", 
            type=str, 
            help="Path to the output.csv file containing the problem set"
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Clear existing problems, test cases, and templates before seeding"
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=200,
            help="Number of records to insert in a single batch"
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Limit the number of seeded problems (useful for fast testing)"
        )

    def handle(self, *args, **options):
        csv_file_path = options["csv_file"]
        reset = options["reset"]
        batch_size = options["batch_size"]
        limit = options["limit"]

        # 1. Check MongoDB availability with a short timeout
        mongo_available = False
        try:
            client = get_mongo_client()
            # The ismaster command is cheap and fast, and will fail if the server is offline
            client.admin.command('ismaster', serverSelectionTimeoutMS=1500)
            mongo_available = True
            self.stdout.write(self.style.SUCCESS("Connected to MongoDB successfully! Templates will be seeded."))
        except Exception as e:
            self.stdout.write(self.style.WARNING(
                f"Could not connect to MongoDB: {e}\n"
                "Continuing without seeding multi-language starter templates to MongoDB."
            ))

        # 2. Reset database tables if requested
        if reset:
            self.stdout.write(self.style.WARNING("Clearing existing problems, test cases, and tags..."))
            TestCase.objects.all().delete()
            Problem.objects.all().delete()
            # Keep tags unless we want a clean slate
            Tag.objects.all().delete()
            if mongo_available:
                try:
                    collection = get_collection("problem_templates")
                    collection.delete_many({})
                    self.stdout.write(self.style.SUCCESS("Cleared problem templates collection in MongoDB."))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Failed to clear MongoDB templates: {e}"))

        # 3. Read and validate CSV file
        try:
            f = open(csv_file_path, mode="r", encoding="utf-8")
            reader = csv.DictReader(f)
        except Exception as e:
            raise CommandError(f"Failed to read CSV file: {e}")

        self.stdout.write(self.style.NOTICE("First pass: caching all tags..."))
        
        # 4. First pass: Collect all unique tags and bulk create them
        unique_tags = set()
        rows_to_process = []
        
        for idx, row in enumerate(reader, 1):
            if limit and idx > limit:
                break
            
            rows_to_process.append(row)
            
            # Extract tags
            tags_str = row.get("tags", "[]")
            try:
                tags_list = ast.literal_eval(tags_str)
                if isinstance(tags_list, list):
                    for tag in tags_list:
                        if tag and str(tag).strip():
                            unique_tags.add(str(tag).strip())
            except Exception:
                pass
        
        f.close()

        self.stdout.write(self.style.NOTICE(f"Found {len(unique_tags)} unique tags. Seeding tags..."))
        
        # Create missing tags
        tag_objects = []
        for tag_name in unique_tags:
            tag_objects.append(Tag(id=uuid.uuid4(), name=tag_name))
        
        # Bulk create tags (ignore conflicts if tag already exists)
        Tag.objects.bulk_create(tag_objects, ignore_conflicts=True)
        
        # Create tag cache
        tag_cache = {tag.name: tag for tag in Tag.objects.all()}
        
        total_problems = len(rows_to_process)
        self.stdout.write(self.style.NOTICE(f"Processing {total_problems} problems for bulk insertion..."))

        # 5. Process in batches
        for i in range(0, total_problems, batch_size):
            batch_rows = rows_to_process[i:i + batch_size]
            
            problems_to_create = []
            testcases_to_create = []
            m2m_relations_to_create = []
            mongo_templates_to_create = []
            
            for row in batch_rows:
                task_id = row.get("task_id")
                if not task_id:
                    continue
                
                # Generate clean slug and title
                slug = slugify(task_id)
                title = task_id.replace("-", " ").title()
                
                # Generate ELO difficulty category default values
                difficulty = row.get("difficulty", "Easy").lower()
                if difficulty not in ["easy", "medium", "hard"]:
                    difficulty = "easy"
                
                description = row.get("problem_description", "")
                starter_code = row.get("starter_code", "")
                
                # Pre-generate UUID for Problem
                problem_id = uuid.uuid4()
                
                # Instantiate Problem
                prob_obj = Problem(
                    id=problem_id,
                    title=title,
                    slug=slug,
                    description=description,
                    difficulty=difficulty,
                    status="approved",
                    time_limit_ms=2000,
                    memory_limit_mb=256
                )
                problems_to_create.append(prob_obj)
                
                # Handle Tags (ManyToMany Junction)
                tags_str = row.get("tags", "[]")
                try:
                    tags_list = ast.literal_eval(tags_str)
                    if isinstance(tags_list, list):
                        for tag_name in tags_list:
                            tag_name = str(tag_name).strip()
                            if tag_name in tag_cache:
                                junction_obj = Problem.tags.through(
                                    problem_id=problem_id,
                                    tag_id=tag_cache[tag_name].id
                                )
                                m2m_relations_to_create.append(junction_obj)
                except Exception:
                    pass
                
                # Handle Test Cases
                io_str = row.get("input_output", "[]")
                try:
                    io_list = ast.literal_eval(io_str)
                    if isinstance(io_list, list):
                        for order, io_item in enumerate(io_list):
                            tc_input = str(io_item.get("input", ""))
                            tc_output = str(io_item.get("output", ""))
                            # Make the first test case a sample, others hidden
                            is_sample = (order == 0)
                            
                            tc_obj = TestCase(
                                id=uuid.uuid4(),
                                problem_id=problem_id,
                                input=tc_input,
                                expected_output=tc_output,
                                is_sample=is_sample,
                                order_index=order
                            )
                            testcases_to_create.append(tc_obj)
                except Exception:
                    pass
                
                # Handle MongoDB Template
                if starter_code:
                    mongo_templates_to_create.append({
                        "problem_id": str(problem_id),
                        "templates": {"python": starter_code}
                    })
            
            # Execute database operations inside an atomic transaction per batch
            try:
                with transaction.atomic():
                    # Bulk create problems (ignore conflicts if already exists by slug)
                    Problem.objects.bulk_create(problems_to_create, ignore_conflicts=True)
                    
                    # Bulk create Many-to-Many tag links
                    Problem.tags.through.objects.bulk_create(m2m_relations_to_create, ignore_conflicts=True)
                    
                    # Bulk create Test Cases
                    TestCase.objects.bulk_create(testcases_to_create, ignore_conflicts=True)
                
                # Bulk insert into MongoDB if online
                if mongo_available and mongo_templates_to_create:
                    try:
                        collection = get_collection("problem_templates")
                        # Perform bulk write operations for MongoDB
                        # We use upsert updates to avoid duplicates on multiple runs
                        from pymongo import UpdateOne
                        requests = [
                            UpdateOne(
                                {"problem_id": item["problem_id"]},
                                {"$set": {"templates": item["templates"]}},
                                upsert=True
                            )
                            for item in mongo_templates_to_create
                        ]
                        collection.bulk_write(requests)
                    except Exception as me:
                        self.stdout.write(self.style.ERROR(f"MongoDB batch write failed: {me}"))
                        
                end_idx = min(i + batch_size, total_problems)
                self.stdout.write(self.style.SUCCESS(f"Successfully batch seeded problems {i + 1} to {end_idx}"))
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Batch {i + 1}-{i + batch_size} failed: {e}"))
                
        self.stdout.write(self.style.SUCCESS("All done seeding the database from output.csv!"))
