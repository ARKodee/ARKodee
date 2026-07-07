import sys
import os
import subprocess
import tempfile
import ast
from django.db.models import Q
from django.db.models.functions import TruncDate
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Problem, TestCase, Submission, UserProblemStats
from .mongo_models import get_problem_templates
from .serializers import (
    ProblemListSerializer,
    ProblemDetailSerializer,
    SubmissionHistorySerializer,
    CodeExecutionRequestSerializer,
)
from django.core.exceptions import ValidationError

def get_problem_by_identifier(identifier):
    """
    Robust lookup helper that resolves a Problem by either its UUID id or slug string.
    """
    queryset = Problem.objects.filter(status="approved")
    try:
        return queryset.get(id=identifier)
    except (ValidationError, Problem.DoesNotExist, ValueError):
        pass
    return get_object_or_404(queryset, slug=identifier)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def problems_list(request):
    search_query = request.query_params.get("search", "").strip()
    difficulty_query = request.query_params.get("difficulty", "").strip().lower()
    
    problems = Problem.objects.filter(status="approved").prefetch_related("tags")
    
    if search_query:
        problems = problems.filter(
            Q(title__icontains=search_query) | Q(description__icontains=search_query)
        )
        
    if difficulty_query and difficulty_query != "all":
        problems = problems.filter(difficulty=difficulty_query)
        
    # Get user problem stats
    stats = {
        s.problem_id: s.status
        for s in UserProblemStats.objects.filter(user=request.user)
    }
    
    serializer = ProblemListSerializer(
        problems,
        many=True,
        context={"user_stats": stats}
    )
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def submission_calendar(request):
    submissions = (
        Submission.objects.filter(user=request.user, verdict="AC")
        .annotate(date=TruncDate("submitted_at"))
        .values("date")
        .annotate(count=Count("id"))
        .order_by("date")
    )
    
    calendar_data = {}
    for item in submissions:
        if item["date"]:
            calendar_data[item["date"].strftime("%Y-%m-%d")] = item["count"]
            
    return Response(calendar_data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def problem_detail(request, problem_slug):
    problem = get_problem_by_identifier(problem_slug)
    try:
        templates = get_problem_templates(problem.id)
    except Exception:
        templates = {}
    
    serializer = ProblemDetailSerializer(
        problem,
        context={"templates": templates}
    )
    return Response(serializer.data, status=status.HTTP_200_OK)


def split_assignments_by_comma(line):
    """
    Splits a comma-separated assignments line by commas, ignoring commas
    that are nested inside brackets [], parentheses (), curly braces {}, or quotes.
    """
    parts = []
    current = []
    bracket_depth = 0
    in_quotes = False
    quote_char = None
    
    for char in line:
        if char in ['"', "'"]:
            if not in_quotes:
                in_quotes = True
                quote_char = char
            elif char == quote_char:
                in_quotes = False
                quote_char = None
            current.append(char)
        elif not in_quotes and char in ['[', '(', '{']:
            bracket_depth += 1
            current.append(char)
        elif not in_quotes and char in [']', ')', '}']:
            bracket_depth = max(0, bracket_depth - 1)
            current.append(char)
        elif char == ',' and bracket_depth == 0 and not in_quotes:
            parts.append("".join(current).strip())
            current = []
        else:
            current.append(char)
            
    if current:
        parts.append("".join(current).strip())
    return [p for p in parts if p]


def format_input_for_sandbox(raw_input):
    if not raw_input:
        return ""
        
    raw_lines = raw_input.strip().splitlines()
    lines = []
    for rl in raw_lines:
        lines.extend(split_assignments_by_comma(rl))
        
    formatted_parts = []
    
    # Check if this looks like a variable assignment input block (LeetCode-style)
    has_assignments = any("=" in line for line in lines)
    if not has_assignments:
        return raw_input # Pass through unchanged if it's already raw stdin
        
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        if "=" in line:
            parts = line.split("=", 1)
            val_str = parts[1].strip()
        else:
            val_str = line
            
        try:
            # Handle JS/JSON boolean and null values
            normalized_val = (
                val_str.replace("true", "True")
                .replace("false", "False")
                .replace("null", "None")
            )
            parsed_obj = ast.literal_eval(normalized_val)
        except Exception:
            parsed_obj = val_str
            
        if isinstance(parsed_obj, list):
            if len(parsed_obj) > 0 and isinstance(parsed_obj[0], list):
                rows = len(parsed_obj)
                cols = len(parsed_obj[0])
                matrix_str = f"{rows} {cols}\n"
                matrix_str += "\n".join(" ".join(map(str, row)) for row in parsed_obj)
                formatted_parts.append(matrix_str)
            else:
                size = len(parsed_obj)
                array_str = f"{size}\n" + " ".join(map(str, parsed_obj))
                formatted_parts.append(array_str)
        elif isinstance(parsed_obj, bool):
            formatted_parts.append("1" if parsed_obj else "0")
        else:
            if isinstance(parsed_obj, str):
                if (parsed_obj.startswith('"') and parsed_obj.endswith('"')) or \
                   (parsed_obj.startswith("'") and parsed_obj.endswith("'")):
                    parsed_obj = parsed_obj[1:-1]
            formatted_parts.append(str(parsed_obj))
            
    return "\n".join(formatted_parts)


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


def get_signature_details(py_starter_code):
    if not py_starter_code:
        return None
    try:
        code_to_parse = py_starter_code.strip()
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
        return {
            "func_name": func_name,
            "params": params,
            "ret_type": ret_type
        }
    except Exception:
        return None


def generate_java_driver(func_name, params, ret_type):
    java_read_lines = []
    call_args = []
    
    for p_name, p_type in params:
        p_type_norm = p_type.strip().replace(" ", "")
        if p_type_norm.startswith("Optional[") and p_type_norm.endswith("]"):
            p_type_norm = p_type_norm[9:-1]
            
        if p_type_norm == "int":
            java_read_lines.append(f"int {p_name} = sc.nextInt();")
            call_args.append(p_name)
        elif p_type_norm in ["str", "String"]:
            java_read_lines.append(f"String {p_name} = sc.next();")
            call_args.append(p_name)
        elif p_type_norm in ["bool", "boolean"]:
            java_read_lines.append(f"boolean {p_name} = sc.next().equals(\"1\");")
            call_args.append(p_name)
        elif p_type_norm in ["float", "double"]:
            java_read_lines.append(f"double {p_name} = sc.nextDouble();")
            call_args.append(p_name)
        elif p_type_norm == "List[int]":
            java_read_lines.append(
                f"int {p_name}_size = sc.nextInt();\n"
                f"        int[] {p_name} = new int[{p_name}_size];\n"
                f"        for (int i = 0; i < {p_name}_size; i++) {p_name}[i] = sc.nextInt();"
            )
            call_args.append(p_name)
        elif p_type_norm == "List[str]":
            java_read_lines.append(
                f"int {p_name}_size = sc.nextInt();\n"
                f"        String[] {p_name} = new String[{p_name}_size];\n"
                f"        for (int i = 0; i < {p_name}_size; i++) {p_name}[i] = sc.next();"
            )
            call_args.append(p_name)
        elif p_type_norm == "List[List[int]]":
            java_read_lines.append(
                f"int {p_name}_rows = sc.nextInt();\n"
                f"        int {p_name}_cols = sc.nextInt();\n"
                f"        int[][] {p_name} = new int[{p_name}_rows][{p_name}_cols];\n"
                f"        for (int i = 0; i < {p_name}_rows; i++) {{\n"
                f"            for (int j = 0; j < {p_name}_cols; j++) {{\n"
                f"                {p_name}[i][j] = sc.nextInt();\n"
                f"            }}\n"
                f"        }}"
            )
            call_args.append(p_name)
        else:
            java_read_lines.append(f"int {p_name} = sc.nextInt();")
            call_args.append(p_name)
            
    read_block = "\n        ".join(java_read_lines)
    args_str = ", ".join(call_args)
    
    ret_type_norm = ret_type.strip().replace(" ", "")
    if ret_type_norm.startswith("Optional[") and ret_type_norm.endswith("]"):
        ret_type_norm = ret_type_norm[9:-1]
        
    if ret_type_norm in ["List[int]", "int[]"]:
        print_statement = "System.out.println(Arrays.toString(ans));"
    else:
        print_statement = "System.out.println(ans);"
        
    driver_code = (
        "\nimport java.util.*;\n\n"
        "public class DriverMain {\n"
        "    public static void main(String[] args) {\n"
        "        Scanner sc = new Scanner(System.in);\n"
        f"        {read_block}\n"
        "        Solution solver = new Solution();\n"
        f"        var ans = solver.{func_name}({args_str});\n"
        f"        {print_statement}\n"
        "        sc.close();\n"
        "    }\n"
    )
    if "ListNode" in ret_type_norm or any("ListNode" in p[1] for p in params):
        driver_code += (
            "    public static class ListNode {\n"
            "        int val;\n"
            "        ListNode next;\n"
            "        ListNode() {}\n"
            "        ListNode(int val) { this.val = val; }\n"
            "        ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n"
            "    }\n"
        )
    driver_code += "}\n"
    return driver_code


def generate_cpp_driver(func_name, params, ret_type):
    cpp_read_lines = []
    call_args = []
    
    for p_name, p_type in params:
        p_type_norm = p_type.strip().replace(" ", "")
        if p_type_norm.startswith("Optional[") and p_type_norm.endswith("]"):
            p_type_norm = p_type_norm[9:-1]
            
        if p_type_norm == "int":
            cpp_read_lines.append(f"int {p_name}; cin >> {p_name};")
            call_args.append(p_name)
        elif p_type_norm in ["str", "string"]:
            cpp_read_lines.append(f"string {p_name}; cin >> {p_name};")
            call_args.append(p_name)
        elif p_type_norm == "bool":
            cpp_read_lines.append(f"bool {p_name}; cin >> {p_name};")
            call_args.append(p_name)
        elif p_type_norm in ["float", "double"]:
            cpp_read_lines.append(f"double {p_name}; cin >> {p_name};")
            call_args.append(p_name)
        elif p_type_norm == "List[int]":
            cpp_read_lines.append(
                f"int {p_name}_size;\n"
                f"    cin >> {p_name}_size;\n"
                f"    vector<int> {p_name}({p_name}_size);\n"
                f"    for (int i = 0; i < {p_name}_size; i++) cin >> {p_name}[i];"
            )
            call_args.append(p_name)
        elif p_type_norm == "List[str]":
            cpp_read_lines.append(
                f"int {p_name}_size;\n"
                f"    cin >> {p_name}_size;\n"
                f"    vector<string> {p_name}({p_name}_size);\n"
                f"    for (int i = 0; i < {p_name}_size; i++) cin >> {p_name}[i];"
            )
            call_args.append(p_name)
        elif p_type_norm == "List[List[int]]":
            cpp_read_lines.append(
                f"int {p_name}_rows, {p_name}_cols;\n"
                f"    cin >> {p_name}_rows >> {p_name}_cols;\n"
                f"    vector<vector<int>> {p_name}({p_name}_rows, vector<int>({p_name}_cols));\n"
                f"    for (int i = 0; i < {p_name}_rows; i++) {{\n"
                f"        for (int j = 0; j < {p_name}_cols; j++) {{\n"
                f"            cin >> {p_name}[i][j];\n"
                f"        }}\n"
                f"    }}"
            )
            call_args.append(p_name)
        else:
            cpp_read_lines.append(f"int {p_name}; cin >> {p_name};")
            call_args.append(p_name)
            
    read_block = "\n    ".join(cpp_read_lines)
    args_str = ", ".join(call_args)
    
    ret_type_norm = ret_type.strip().replace(" ", "")
    if ret_type_norm.startswith("Optional[") and ret_type_norm.endswith("]"):
        ret_type_norm = ret_type_norm[9:-1]
        
    if ret_type_norm in ["List[int]", "int[]", "vector<int>", "vector<int>&"]:
        print_statement = (
            "cout << \"[\";\n"
            "    for (size_t i = 0; i < ans.size(); i++) {\n"
            "        cout << ans[i];\n"
            "        if (i < ans.size() - 1) cout << \",\";\n"
            "    }\n"
            "    cout << \"]\" << endl;"
        )
    else:
        print_statement = "cout << ans << endl;"
        
    driver_code = ""
    if "ListNode" in ret_type_norm or any("ListNode" in p[1] for p in params):
        driver_code += (
            "struct ListNode {\n"
            "    int val;\n"
            "    ListNode *next;\n"
            "    ListNode() : val(0), next(nullptr) {}\n"
            "    ListNode(int x) : val(x), next(nullptr) {}\n"
            "    ListNode(int x, ListNode *next) : val(x), next(next) {}\n"
            "};\n\n"
        )
        
    driver_code += (
        "int main() {\n"
        f"    {read_block}\n"
        "    Solution solver;\n"
        f"    auto ans = solver.{func_name}({args_str});\n"
        f"    {print_statement}\n"
        "    return 0;\n"
        "}\n"
    )
    return driver_code


def generate_js_driver(func_name, params, ret_type):
    js_read_lines = []
    call_args = []
    
    for p_name, p_type in params:
        p_type_norm = p_type.strip().replace(" ", "")
        if p_type_norm.startswith("Optional[") and p_type_norm.endswith("]"):
            p_type_norm = p_type_norm[9:-1]
            
        if p_type_norm == "int":
            js_read_lines.append(f"let {p_name} = parseInt(tokens.shift(), 10);")
            call_args.append(p_name)
        elif p_type_norm in ["str", "string"]:
            js_read_lines.append(f"let {p_name} = tokens.shift();")
            call_args.append(p_name)
        elif p_type_norm == "bool":
            js_read_lines.append(f"let {p_name} = tokens.shift() === '1';")
            call_args.append(p_name)
        elif p_type_norm in ["float", "double"]:
            js_read_lines.append(f"let {p_name} = parseFloat(tokens.shift());")
            call_args.append(p_name)
        elif p_type_norm == "List[int]":
            js_read_lines.append(
                f"let {p_name}_size = parseInt(tokens.shift(), 10);\n"
                f"    let {p_name} = [];\n"
                f"    for (let i = 0; i < {p_name}_size; i++) {p_name}.push(parseInt(tokens.shift(), 10));"
            )
            call_args.append(p_name)
        elif p_type_norm == "List[str]":
            js_read_lines.append(
                f"let {p_name}_size = parseInt(tokens.shift(), 10);\n"
                f"    let {p_name} = [];\n"
                f"    for (let i = 0; i < {p_name}_size; i++) {p_name}.push(tokens.shift());"
            )
            call_args.append(p_name)
        elif p_type_norm == "List[List[int]]":
            js_read_lines.append(
                f"let {p_name}_rows = parseInt(tokens.shift(), 10);\n"
                f"    let {p_name}_cols = parseInt(tokens.shift(), 10);\n"
                f"    let {p_name} = [];\n"
                f"    for (let i = 0; i < {p_name}_rows; i++) {{\n"
                f"        let row = [];\n"
                f"        for (let j = 0; j < {p_name}_cols; j++) {{\n"
                f"            row.push(parseInt(tokens.shift(), 10));\n"
                f"        }}\n"
                f"        {p_name}.push(row);\n"
                f"    }}"
            )
            call_args.append(p_name)
        else:
            js_read_lines.append(f"let {p_name} = parseInt(tokens.shift(), 10);")
            call_args.append(p_name)
            
    read_block = "\n    ".join(js_read_lines)
    args_str = ", ".join(call_args)
    
    driver_code = (
        "\nconst fs = require('fs');\n"
        "const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n"
        "if (tokens.length > 0 && tokens[0] !== '') {\n"
        f"    {read_block}\n"
        f"    let ans = {func_name}({args_str});\n"
        "    console.log(JSON.stringify(ans));\n"
        "}\n"
    )
    return driver_code


def generate_py_driver(func_name, params, ret_type):
    py_read_lines = []
    call_args = []
    
    for p_name, p_type in params:
        p_type_norm = p_type.strip().replace(" ", "")
        if p_type_norm.startswith("Optional[") and p_type_norm.endswith("]"):
            p_type_norm = p_type_norm[9:-1]
            
        if p_type_norm == "int":
            py_read_lines.append(f"{p_name} = int(next_token())")
            call_args.append(p_name)
        elif p_type_norm in ["str", "string"]:
            py_read_lines.append(f"{p_name} = next_token()")
            call_args.append(p_name)
        elif p_type_norm == "bool":
            py_read_lines.append(f"{p_name} = next_token() == '1'")
            call_args.append(p_name)
        elif p_type_norm in ["float", "double"]:
            py_read_lines.append(f"{p_name} = float(next_token())")
            call_args.append(p_name)
        elif p_type_norm == "List[int]":
            py_read_lines.append(
                f"{p_name}_size = int(next_token())\n"
                f"    {p_name} = [int(next_token()) for _ in range({p_name}_size)]"
            )
            call_args.append(p_name)
        elif p_type_norm == "List[str]":
            py_read_lines.append(
                f"{p_name}_size = int(next_token())\n"
                f"    {p_name} = [next_token() for _ in range({p_name}_size)]"
            )
            call_args.append(p_name)
        elif p_type_norm == "List[List[int]]":
            py_read_lines.append(
                f"{p_name}_rows = int(next_token())\n"
                f"    {p_name}_cols = int(next_token())\n"
                f"    {p_name} = []\n"
                f"    for _ in range({p_name}_rows):\n"
                f"        {p_name}.append([int(next_token()) for _ in range({p_name}_cols)])"
            )
            call_args.append(p_name)
        else:
            py_read_lines.append(f"{p_name} = int(next_token())")
            call_args.append(p_name)
            
    read_block = "\n    ".join(py_read_lines)
    args_str = ", ".join(call_args)
    
    driver_code = (
        "\nimport sys\n"
        "import json\n\n"
        "def run_driver():\n"
        "    input_data = sys.stdin.read().split()\n"
        "    if not input_data:\n"
        "        return\n"
        "    iterator = iter(input_data)\n"
        "    def next_token():\n"
        "        return next(iterator)\n"
        f"    {read_block}\n"
        "    solver = Solution()\n"
        f"    ans = solver.{func_name}({args_str})\n"
        "    print(json.dumps(ans))\n\n"
        "if __name__ == '__main__':\n"
        "    run_driver()\n"
    )
    return driver_code


def run_code_in_sandbox(code, language, test_cases, time_limit_ms, starter_code=None):
    results = []
    verdict = "AC"
    
    if language not in ["python", "javascript", "java", "cpp"]:
        return "CE", [{
            "input": "N/A",
            "expected": "N/A",
            "output": "",
            "error": f"Language {language} is not supported in the sandbox runner.",
            "passed": False
        }]
        
    # Attempt to parse function details from Python starter code for LeetCode-style wrapping
    details = get_signature_details(starter_code) if starter_code else None
    
    # We use a temporary directory for compilation and running
    with tempfile.TemporaryDirectory() as temp_dir:
        exec_cmd = []
        
        if language == "java":
            try:
                if details:
                    # Write user code to Solution.java
                    solution_path = os.path.join(temp_dir, "Solution.java")
                    with open(solution_path, "w", encoding="utf-8") as f:
                        f.write(code)
                    
                    # Write generated driver to DriverMain.java
                    driver_code = generate_java_driver(details["func_name"], details["params"], details["ret_type"])
                    driver_path = os.path.join(temp_dir, "DriverMain.java")
                    with open(driver_path, "w", encoding="utf-8") as f:
                        f.write(driver_code)
                        
                    compile_files = ["Solution.java", "DriverMain.java"]
                    exec_cmd = ["java", "DriverMain"]
                else:
                    # Fallback to direct execution style (Main.java)
                    src_path = os.path.join(temp_dir, "Main.java")
                    with open(src_path, "w", encoding="utf-8") as f:
                        f.write(code)
                    compile_files = ["Main.java"]
                    exec_cmd = ["java", "Main"]
                    
                compile_proc = subprocess.run(
                    ["javac"] + compile_files,
                    cwd=temp_dir,
                    capture_output=True,
                    text=True,
                    timeout=10 # Compilation timeout
                )
                if compile_proc.returncode != 0:
                    return "CE", [{
                        "input": "Compilation Stage",
                        "expected": "Build Success",
                        "output": "",
                        "error": f"Java Compilation Error:\n{compile_proc.stderr or compile_proc.stdout}",
                        "passed": False
                    }]
            except FileNotFoundError:
                return "CE", [{
                    "input": "System check",
                    "expected": "Java JDK installed",
                    "output": "",
                    "error": "Java compiler ('javac') was not found on the host system. Please install the Java Development Kit (JDK) to run Java solutions.",
                    "passed": False
                }]
                
        elif language == "cpp":
            try:
                exe_name = "main.exe" if os.name == 'nt' else "./main.out"
                src_path = os.path.join(temp_dir, "main.cpp")
                
                if details:
                    # Wrap: User code + C++ driver wrapper
                    driver_code = generate_cpp_driver(details["func_name"], details["params"], details["ret_type"])
                    combined_code = code + "\n" + driver_code
                else:
                    combined_code = code
                    
                with open(src_path, "w", encoding="utf-8") as f:
                    f.write(combined_code)
                    
                compile_proc = subprocess.run(
                    ["g++", "-O3", "main.cpp", "-o", exe_name],
                    cwd=temp_dir,
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if compile_proc.returncode != 0:
                    return "CE", [{
                        "input": "Compilation Stage",
                        "expected": "Build Success",
                        "output": "",
                        "error": f"C++ Compilation Error:\n{compile_proc.stderr or compile_proc.stdout}",
                        "passed": False
                    }]
                exec_cmd = [os.path.join(temp_dir, exe_name)]
            except FileNotFoundError:
                return "CE", [{
                    "input": "System check",
                    "expected": "GCC/G++ installed",
                    "output": "",
                    "error": "C++ compiler ('g++') was not found on the host system. Please install GCC/G++ compiler to run C++ solutions.",
                    "passed": False
                }]
                
        elif language == "python":
            src_path = os.path.join(temp_dir, "solution.py")
            if details:
                driver_code = generate_py_driver(details["func_name"], details["params"], details["ret_type"])
                # Import typing helper and combine
                combined_code = "from typing import *\n" + code + "\n" + driver_code
            else:
                combined_code = code
                
            with open(src_path, "w", encoding="utf-8") as f:
                f.write(combined_code)
            exec_cmd = [sys.executable, src_path]
            
        elif language == "javascript":
            try:
                # Test if node is installed
                subprocess.run(["node", "--version"], capture_output=True)
                src_path = os.path.join(temp_dir, "solution.js")
                
                if details:
                    driver_code = generate_js_driver(details["func_name"], details["params"], details["ret_type"])
                    combined_code = code + "\n" + driver_code
                else:
                    combined_code = code
                    
                with open(src_path, "w", encoding="utf-8") as f:
                    f.write(combined_code)
                exec_cmd = ["node", src_path]
            except FileNotFoundError:
                return "CE", [{
                    "input": "System check",
                    "expected": "Node.js installed",
                    "output": "",
                    "error": "Node.js runtime was not found on the host system. Please install Node.js to run JavaScript solutions.",
                    "passed": False
                }]

        # Execution Stage
        for index, tc in enumerate(test_cases):
            try:
                formatted_input = format_input_for_sandbox(tc.input)
                timeout_sec = max(1, time_limit_ms / 1000.0)
                proc = subprocess.run(
                    exec_cmd,
                    cwd=temp_dir,
                    input=formatted_input,
                    capture_output=True,
                    text=True,
                    timeout=timeout_sec
                )
                
                if proc.returncode != 0:
                    verdict = "RE"
                    results.append({
                        "input": tc.input,
                        "expected": tc.expected_output,
                        "output": proc.stdout,
                        "error": proc.stderr or f"Exit code {proc.returncode}",
                        "passed": False,
                        "verdict": "RE"
                    })
                    break
                else:
                    # Strip all spaces to make comparisons formatting-agnostic (e.g. [0, 1] vs [0,1])
                    user_output = proc.stdout.strip().replace(" ", "")
                    expected = tc.expected_output.strip().replace(" ", "")
                    passed = user_output == expected
                    
                    results.append({
                        "input": tc.input,
                        "expected": tc.expected_output.strip(),
                        "output": proc.stdout.strip(),
                        "passed": passed,
                        "verdict": "AC" if passed else "WA"
                    })
                    if not passed:
                        verdict = "WA"
                        break
                        
            except subprocess.TimeoutExpired:
                verdict = "TLE"
                results.append({
                    "input": tc.input,
                    "expected": tc.expected_output,
                    "output": "",
                    "error": "Time Limit Exceeded",
                    "passed": False,
                    "verdict": "TLE"
                })
                break
            except Exception as e:
                verdict = "RE"
                results.append({
                    "input": tc.input,
                    "expected": tc.expected_output,
                    "output": "",
                    "error": str(e),
                    "passed": False,
                    "verdict": "RE"
                })
                break
                
    return verdict, results


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def run_code(request, problem_slug):
    problem = get_problem_by_identifier(problem_slug)
    
    req_serializer = CodeExecutionRequestSerializer(data=request.data)
    if not req_serializer.is_valid():
        return Response(req_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    code = req_serializer.validated_data["code"]
    language = req_serializer.validated_data["language"]
    
    sample_cases = problem.test_cases.filter(is_sample=True).order_by("order_index")
    if not sample_cases.exists():
        return Response({"error": "No sample test cases defined for this problem."}, status=status.HTTP_400_BAD_REQUEST)
        
    # Get Python signature templates from MongoDB to drive LeetCode-style run
    templates = {}
    try:
        templates = get_problem_templates(str(problem.id))
    except Exception:
        pass
    starter_code = templates.get("python", "")
    
    verdict, results = run_code_in_sandbox(code, language, sample_cases, problem.time_limit_ms, starter_code)
    
    return Response({
        "verdict": verdict,
        "results": results
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_code(request, problem_slug):
    problem = get_problem_by_identifier(problem_slug)
    
    req_serializer = CodeExecutionRequestSerializer(data=request.data)
    if not req_serializer.is_valid():
        return Response(req_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    code = req_serializer.validated_data["code"]
    language = req_serializer.validated_data["language"]
    
    all_cases = problem.test_cases.all().order_by("order_index")
    if not all_cases.exists():
        return Response({"error": "No test cases defined for this problem."}, status=status.HTTP_400_BAD_REQUEST)
        
    # Get Python signature templates from MongoDB to drive LeetCode-style submit
    templates = {}
    try:
        templates = get_problem_templates(str(problem.id))
    except Exception:
        pass
    starter_code = templates.get("python", "")
    
    verdict, results = run_code_in_sandbox(code, language, all_cases, problem.time_limit_ms, starter_code)
    
    # Calculate passed test cases count
    passed_count = sum(1 for r in results if r["passed"])
    total_count = len(all_cases)
    
    contest_identifier = request.data.get("contest_id") or request.data.get("contest_slug")
    contest_obj = None
    if contest_identifier:
        try:
            from apps.contests.models import Contest
            contest_obj = Contest.objects.filter(id=contest_identifier).first() or Contest.objects.filter(slug=contest_identifier).first()
        except Exception:
            pass

    # Update UserProblemStats using the base verdict
    stats, created = UserProblemStats.objects.get_or_create(
        user=request.user,
        problem=problem,
    )
    stats.attempts_count += 1
    
    if verdict == "AC":
        stats.status = "solved"
    elif stats.status != "solved":
        stats.status = "attempted"
    stats.save()

    # Format verdict on failure for the HTTP response to show failed testcase (1-based index)
    formatted_verdict = verdict
    if verdict != "AC":
        formatted_verdict = f"{verdict} on Testcase {passed_count + 1}"

    # Create submission record with standard max_length-compliant verdict code
    submission = Submission.objects.create(
        user=request.user,
        problem=problem,
        contest=contest_obj,
        language=language,
        code=code,
        verdict=verdict,
        test_cases_passed=passed_count,
        total_test_cases=total_count,
    )
    
    # Strip testcase inputs/outputs for contest submissions to prevent inspecting hidden testcases
    if contest_obj is not None:
        stripped_results = []
        for r in results[:3]:
            stripped_r = {
                "passed": r.get("passed", False),
                "verdict": r.get("verdict", ""),
            }
            # Only keep error log if it is a compile error or runtime exception (no input/expected mismatch details)
            if r.get("verdict") in ["CE", "RE"]:
                stripped_r["error"] = r.get("error", "")
            stripped_results.append(stripped_r)
        response_results = stripped_results
    else:
        response_results = results[:3]

    return Response({
        "submission_id": str(submission.id),
        "verdict": formatted_verdict,
        "passed_count": passed_count,
        "total_count": total_count,
        "results": response_results
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def problem_submissions(request, problem_slug):
    problem = get_problem_by_identifier(problem_slug)
    # Fetch all submissions for this problem by the authenticated user, newest first
    submissions = Submission.objects.filter(problem=problem, user=request.user).order_by("-submitted_at")
    serializer = SubmissionHistorySerializer(submissions, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)
