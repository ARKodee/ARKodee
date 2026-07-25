import csv
import ast
import sys
import uuid
from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify
from django.db import transaction
from apps.problems.models import Problem, Tag, TestCase

# Increase field limit to handle huge fields in CSV
csv.field_size_limit(sys.maxsize)

def map_type(py_type, target_lang):
    t = py_type.strip().replace(" ", "")
    if t.startswith("Optional[") and t.endswith("]"):
        t = t[9:-1]
        
    mappings = {
        "int": {"java": "int", "cpp": "int", "js": "number"},
        "str": {"java": "String", "cpp": "string", "js": "string"},
        "bool": {"java": "boolean", "cpp": "bool", "js": "boolean"},
        "float": {"java": "double", "cpp": "double", "js": "number"},
        "List[int]": {"java": "int[]", "cpp": "vector<int>&", "js": "array"},
        "List[str]": {"java": "String[]", "cpp": "vector<string>&", "js": "array"},
        "List[float]": {"java": "double[]", "cpp": "vector<double>&", "js": "array"},
        "List[bool]": {"java": "boolean[]", "cpp": "vector<bool>&", "js": "array"},
        "List[List[int]]": {"java": "int[][]", "cpp": "vector<vector<int>>&", "js": "array"},
        "List[List[str]]": {"java": "String[][]", "cpp": "vector<vector<string>>&", "js": "array"},
        "ListNode": {"java": "ListNode", "cpp": "ListNode*", "js": "ListNode"},
        "TreeNode": {"java": "TreeNode", "cpp": "TreeNode*", "js": "TreeNode"},
    }
    
    if t in mappings:
        return mappings[t][target_lang]
        
    if t.startswith("List[") and t.endswith("]"):
        inner = t[5:-1]
        inner_mapped = map_type(inner, target_lang)
        if target_lang == "java":
            return f"{inner_mapped}[]"
        elif target_lang == "cpp":
            return f"vector<{inner_mapped.replace('&', '')}>&"
        else:
            return "array"
            
    return "int" if target_lang != "js" else "any"

def translate_python_starter_code(py_code):
    try:
        code_to_parse = py_code.strip()
        # Append pass body if it ends at the colon to make it a valid block
        if code_to_parse.endswith(':'):
            code_to_parse += '\n        pass'
        elif not (code_to_parse.endswith('pass') or code_to_parse.endswith('...')):
            code_to_parse += '\n        pass'
            
        tree = ast.parse(code_to_parse)
        class_node = None
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                class_node = node
                break
                
        if not class_node:
            func_node = None
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    func_node = node
                    break
        else:
            func_node = None
            for node in class_node.body:
                if isinstance(node, ast.FunctionDef):
                    func_node = node
                    break
                    
        if not func_node:
            return None
            
        func_name = func_node.name
        params = []
        for arg in func_node.args.args:
            if arg.arg == 'self':
                continue
            annot = ast.unparse(arg.annotation) if arg.annotation else 'int'
            params.append((arg.arg, annot))
            
        ret_type = ast.unparse(func_node.returns) if func_node.returns else 'int'
        
        java_ret = map_type(ret_type, "java")
        java_args = ", ".join([f"{map_type(p[1], 'java')} {p[0]}" for p in params])
        java_code = f"class Solution {{\n    public {java_ret} {func_name}({java_args}) {{\n        // Write your solution here\n    }}\n}}"
        
        cpp_ret = map_type(ret_type, "cpp")
        cpp_args = ", ".join([f"{map_type(p[1], 'cpp')} {p[0]}" for p in params])
        cpp_code = f"class Solution {{\npublic:\n    {cpp_ret} {func_name}({cpp_args}) {{\n        \n    }}\n}};"
        
        js_args = ", ".join([p[0] for p in params])
        js_code = "/**\n"
        for p in params:
            js_code += f" * @param {{{map_type(p[1], 'js')}}} {p[0]}\n"
        js_code += f" * @return {{{map_type(ret_type, 'js')}}}\n */\n"
        js_code += f"var {func_name} = function({js_args}) {{\n    \n}};"
        
        py_args_str = ", ".join([f"{p[0]}: {p[1]}" for p in params])
        if py_args_str:
            py_code_wrapped = f"class Solution:\n    def {func_name}(self, {py_args_str}) -> {ret_type}:\n        pass"
        else:
            py_code_wrapped = f"class Solution:\n    def {func_name}(self) -> {ret_type}:\n        pass"
            
        return {
            "python": py_code_wrapped,
            "cpp": cpp_code,
            "java": java_code,
            "javascript": js_code
        }
    except Exception:
        return None

class Command(BaseCommand):
    help = "Seed problems, test cases, and templates from output.csv into PostgreSQL"

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

        # Reset database tables if requested
        if reset:
            self.stdout.write(self.style.WARNING("Clearing existing problems, test cases, and tags..."))
            TestCase.objects.all().delete()
            Problem.objects.all().delete()
            Tag.objects.all().delete()

        # Read and validate CSV file
        try:
            f = open(csv_file_path, mode="r", encoding="utf-8")
            reader = csv.DictReader(f)
        except Exception as e:
            raise CommandError(f"Failed to read CSV file: {e}")

        self.stdout.write(self.style.NOTICE("First pass: caching all tags..."))
        
        # First pass: Collect all unique tags and bulk create them
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

        # Process in batches
        for i in range(0, total_problems, batch_size):
            batch_rows = rows_to_process[i:i + batch_size]
            
            problems_to_create = []
            testcases_to_create = []
            m2m_relations_to_create = []
            
            # Fetch existing slugs in this batch's context to avoid duplicate insert errors
            slugs_in_batch = [slugify(row.get("task_id", "")) for row in batch_rows if row.get("task_id")]
            existing_slugs = set(Problem.objects.filter(slug__in=slugs_in_batch).values_list("slug", flat=True))
            
            for row in batch_rows:
                task_id = row.get("task_id")
                if not task_id:
                    continue
                
                # Generate clean slug and title
                slug = slugify(task_id)
                if slug in existing_slugs:
                    continue
                    
                title = task_id.replace("-", " ").title()
                
                # Generate ELO difficulty category default values
                difficulty = row.get("difficulty", "Easy").lower()
                if difficulty not in ["easy", "medium", "hard"]:
                    difficulty = "easy"
                
                description = row.get("problem_description", "")
                starter_code = row.get("starter_code", "")
                
                templates_dict = {}
                if starter_code:
                    templates_dict = translate_python_starter_code(starter_code)
                    if not templates_dict:
                        templates_dict = {"python": starter_code}

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
                    memory_limit_mb=256,
                    templates=templates_dict
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
            
            # Execute database operations inside an atomic transaction per batch
            try:
                with transaction.atomic():
                    # Bulk create problems (ignore conflicts if already exists by slug)
                    Problem.objects.bulk_create(problems_to_create, ignore_conflicts=True)
                    
                    # Bulk create Many-to-Many tag links
                    Problem.tags.through.objects.bulk_create(m2m_relations_to_create, ignore_conflicts=True)
                    
                    # Bulk create Test Cases
                    TestCase.objects.bulk_create(testcases_to_create, ignore_conflicts=True)
                        
                end_idx = min(i + batch_size, total_problems)
                self.stdout.write(self.style.SUCCESS(f"Successfully batch seeded problems {i + 1} to {end_idx}"))
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Batch {i + 1}-{i + batch_size} failed: {e}"))
                
        self.stdout.write(self.style.SUCCESS("All done seeding the database from output.csv!"))
