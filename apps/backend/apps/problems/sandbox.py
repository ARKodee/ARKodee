import os
import sys
import ast
import re
import subprocess
import tempfile


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


def sanitize_error_message(raw_error, language, wrapper_line_count=0):
    """
    Sanitizes raw error/stderr outputs to ensure users ONLY see clean,
    user-facing error tracebacks from their solution code.
    Strips internal temporary directory paths, wrapper scaffolding frames,
    and adjusts line numbers to match the user's editor.
    """
    if not raw_error:
        return ""

    lines = raw_error.strip().splitlines()
    cleaned_lines = []

    # Regex patterns for temp directories and wrapper files
    temp_dir_pattern = re.compile(r'(/tmp/tmp[a-zA-Z0-9_]+|/private/tmp/tmp[a-zA-Z0-9_]+|[A-Z]:\\[^\\]+\\AppData\\Local\\Temp\\[^\\]+)', re.IGNORECASE)

    for line in lines:
        # Ignore internal wrapper execution lines
        if "run_driver()" in line or "next_token()" in line or "DriverMain.java" in line or "DriverMain" in line:
            continue
        
        # Replace temp file paths with user-friendly file names
        cleaned = temp_dir_pattern.sub("solution", line)
        cleaned = cleaned.replace("solution.py", "Solution.py").replace("main.cpp", "Solution.cpp").replace("solution.js", "Solution.js").replace("Main.java", "Solution.java")

        # Adjust line numbers if a wrapper header was prepended
        if wrapper_line_count > 0:
            def adjust_line(match):
                line_num = int(match.group(1))
                adjusted = max(1, line_num - wrapper_line_count)
                return f"line {adjusted}"

            cleaned = re.sub(r'line (\d+)', adjust_line, cleaned)

        cleaned_lines.append(cleaned)

    result = "\n".join(cleaned_lines).strip()
    if not result:
        return "Runtime Error occurred during code execution."
    return result


def extract_user_python_details(code):
    """
    Inspects user Python code directly to find class Solution or function name.
    """
    try:
        tree = ast.parse(code)
        class_node = None
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                class_node = node
                break
        
        func_node = None
        if class_node:
            for node in class_node.body:
                if isinstance(node, ast.FunctionDef):
                    func_node = node
                    break
        else:
            for node in ast.walk(tree):
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
            "ret_type": ret_type,
            "has_class": class_node is not None
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
        "        if (!sc.hasNext()) return;\n"
        f"        {read_block}\n"
        "        Solution solver = new Solution();\n"
        f"        var ans = solver.{func_name}({args_str});\n"
        f"        {print_statement}\n"
        "        sc.close();\n"
        "    }\n"
        "}\n"
    )
    return driver_code


def generate_cpp_driver(func_name, params, ret_type):
    cpp_read_lines = []
    call_args = []
    
    for p_name, p_type in params:
        p_type_norm = p_type.strip().replace(" ", "")
        if p_type_norm.startswith("Optional[") and p_type_norm.endswith("]"):
            p_type_norm = p_type_norm[9:-1]
            
        if p_type_norm == "int":
            cpp_read_lines.append(f"int {p_name}; if (!(cin >> {p_name})) return 0;")
            call_args.append(p_name)
        elif p_type_norm in ["str", "string"]:
            cpp_read_lines.append(f"string {p_name}; if (!(cin >> {p_name})) return 0;")
            call_args.append(p_name)
        elif p_type_norm == "bool":
            cpp_read_lines.append(f"int {p_name}_b; if (!(cin >> {p_name}_b)) return 0; bool {p_name} = ({p_name}_b != 0);")
            call_args.append(p_name)
        elif p_type_norm in ["float", "double"]:
            cpp_read_lines.append(f"double {p_name}; if (!(cin >> {p_name})) return 0;")
            call_args.append(p_name)
        elif p_type_norm == "List[int]":
            cpp_read_lines.append(
                f"int {p_name}_size; if (!(cin >> {p_name}_size)) return 0;\n"
                f"    vector<int> {p_name}({p_name}_size);\n"
                f"    for (int i = 0; i < {p_name}_size; i++) cin >> {p_name}[i];"
            )
            call_args.append(p_name)
        elif p_type_norm == "List[str]":
            cpp_read_lines.append(
                f"int {p_name}_size; if (!(cin >> {p_name}_size)) return 0;\n"
                f"    vector<string> {p_name}({p_name}_size);\n"
                f"    for (int i = 0; i < {p_name}_size; i++) cin >> {p_name}[i];"
            )
            call_args.append(p_name)
        elif p_type_norm == "List[List[int]]":
            cpp_read_lines.append(
                f"int {p_name}_r, {p_name}_c; if (!(cin >> {p_name}_r >> {p_name}_c)) return 0;\n"
                f"    vector<vector<int>> {p_name}({p_name}_r, vector<int>({p_name}_c));\n"
                f"    for (int i = 0; i < {p_name}_r; i++)\n"
                f"        for (int j = 0; j < {p_name}_c; j++) cin >> {p_name}[i][j];"
            )
            call_args.append(p_name)
        else:
            cpp_read_lines.append(f"int {p_name}; if (!(cin >> {p_name})) return 0;")
            call_args.append(p_name)
            
    read_block = "\n    ".join(cpp_read_lines)
    args_str = ", ".join(call_args)
    
    ret_type_norm = ret_type.strip().replace(" ", "")
    if ret_type_norm.startswith("Optional[") and ret_type_norm.endswith("]"):
        ret_type_norm = ret_type_norm[9:-1]
        
    if ret_type_norm in ["List[int]", "vector<int>"]:
        print_code = (
            "cout << \"[\";\n"
            "    for (size_t i = 0; i < ans.size(); i++) {\n"
            "        cout << ans[i] << (i + 1 == ans.size() ? \"\" : \",\");\n"
            "    }\n"
            "    cout << \"]\" << endl;"
        )
    else:
        print_code = "cout << ans << endl;"
        
    driver_code = (
        "\n#include <iostream>\n"
        "#include <vector>\n"
        "#include <string>\n"
        "using namespace std;\n\n"
        "int main() {\n"
        "    ios_base::sync_with_stdio(false);\n"
        "    cin.tie(NULL);\n"
        f"    {read_block}\n"
        "    Solution solver;\n"
        f"    auto ans = solver.{func_name}({args_str});\n"
        f"    {print_code}\n"
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
        elif p_type_norm in ["bool", "boolean"]:
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
        f"    let solver = typeof Solution !== 'undefined' ? new Solution() : null;\n"
        f"    let ans = solver ? solver.{func_name}({args_str}) : {func_name}({args_str});\n"
        "    console.log(JSON.stringify(ans));\n"
        "}\n"
    )
    return driver_code


def generate_py_driver(func_name, params, ret_type, has_class=True):
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
    
    solver_inst = "solver = Solution()" if has_class else ""
    call_expr = f"solver.{func_name}({args_str})" if has_class else f"{func_name}({args_str})"

    driver_code = (
        "\nimport sys\n"
        "import json\n\n"
        "def _run_driver():\n"
        "    input_data = sys.stdin.read().split()\n"
        "    if not input_data:\n"
        "        return\n"
        "    iterator = iter(input_data)\n"
        "    def next_token():\n"
        "        return next(iterator)\n"
        f"    {read_block}\n"
        f"    {solver_inst}\n"
        f"    ans = {call_expr}\n"
        "    print(json.dumps(ans))\n\n"
        "if __name__ == '__main__':\n"
        "    _run_driver()\n"
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
            "error": f"Language '{language}' is not supported in the sandbox runner.",
            "passed": False,
            "verdict": "CE"
        }]
        
    # Inspect user code directly first, fallback to starter code signature if needed
    details = extract_user_python_details(code)
    if not details and starter_code:
        details = extract_user_python_details(starter_code)

    # Check if user code already contains its own main/runner entry point
    is_standalone_cpp = "int main(" in code
    is_standalone_java = "public static void main(" in code or "static void main(" in code
    is_standalone_py = "__name__ == '__main__'" in code or "__name__=='__main__'" in code
    is_standalone_js = "fs.readFileSync" in code or "readline" in code

    with tempfile.TemporaryDirectory() as temp_dir:
        exec_cmd = []
        wrapper_line_count = 0

        # Compile / Setup Stage
        if language == "java":
            try:
                if details and not is_standalone_java:
                    solution_path = os.path.join(temp_dir, "Solution.java")
                    with open(solution_path, "w", encoding="utf-8") as f:
                        f.write(code)
                    
                    driver_code = generate_java_driver(details["func_name"], details["params"], details["ret_type"])
                    driver_path = os.path.join(temp_dir, "DriverMain.java")
                    with open(driver_path, "w", encoding="utf-8") as f:
                        f.write(driver_code)
                        
                    compile_files = ["Solution.java", "DriverMain.java"]
                    exec_cmd = ["java", "DriverMain"]
                else:
                    # Direct Main.java execution
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
                    timeout=10
                )
                if compile_proc.returncode != 0:
                    clean_err = sanitize_error_message(compile_proc.stderr or compile_proc.stdout, "java")
                    return "CE", [{
                        "input": "Compilation",
                        "expected": "Build Success",
                        "output": "",
                        "error": clean_err,
                        "passed": False,
                        "verdict": "CE"
                    }]
            except FileNotFoundError:
                return "CE", [{
                    "input": "System Check",
                    "expected": "Java JDK installed",
                    "output": "",
                    "error": "Java compiler ('javac') was not found on the host system. Please install JDK to run Java solutions.",
                    "passed": False,
                    "verdict": "CE"
                }]

        elif language == "cpp":
            try:
                exe_name = "main.exe" if os.name == 'nt' else "./main.out"
                src_path = os.path.join(temp_dir, "main.cpp")
                
                if details and not is_standalone_cpp:
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
                    clean_err = sanitize_error_message(compile_proc.stderr or compile_proc.stdout, "cpp")
                    return "CE", [{
                        "input": "Compilation",
                        "expected": "Build Success",
                        "output": "",
                        "error": clean_err,
                        "passed": False,
                        "verdict": "CE"
                    }]
                exec_cmd = [os.path.join(temp_dir, exe_name)]
            except FileNotFoundError:
                return "CE", [{
                    "input": "System Check",
                    "expected": "GCC/G++ installed",
                    "output": "",
                    "error": "C++ compiler ('g++') was not found on the host system. Please install G++ compiler to run C++ solutions.",
                    "passed": False,
                    "verdict": "CE"
                }]

        elif language == "python":
            src_path = os.path.join(temp_dir, "solution.py")
            if details and not is_standalone_py:
                driver_code = generate_py_driver(details["func_name"], details["params"], details["ret_type"], details["has_class"])
                combined_code = "from typing import *\n" + code + "\n" + driver_code
                wrapper_line_count = 1 # 'from typing import *' is line 1
            else:
                combined_code = code
                
            with open(src_path, "w", encoding="utf-8") as f:
                f.write(combined_code)
            exec_cmd = [sys.executable, src_path]

        elif language == "javascript":
            try:
                subprocess.run(["node", "--version"], capture_output=True)
                src_path = os.path.join(temp_dir, "solution.js")
                
                if details and not is_standalone_js:
                    driver_code = generate_js_driver(details["func_name"], details["params"], details["ret_type"])
                    combined_code = code + "\n" + driver_code
                else:
                    combined_code = code
                    
                with open(src_path, "w", encoding="utf-8") as f:
                    f.write(combined_code)
                exec_cmd = ["node", src_path]
            except FileNotFoundError:
                return "CE", [{
                    "input": "System Check",
                    "expected": "Node.js installed",
                    "output": "",
                    "error": "Node.js runtime was not found on the host system. Please install Node.js to run JavaScript solutions.",
                    "passed": False,
                    "verdict": "CE"
                }]

        # Execution Stage across all Test Cases
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
                    clean_err = sanitize_error_message(proc.stderr or f"Runtime Error (Exit Code {proc.returncode})", language, wrapper_line_count)
                    results.append({
                        "input": tc.input,
                        "expected": tc.expected_output,
                        "output": proc.stdout or "",
                        "error": clean_err,
                        "passed": False,
                        "verdict": "RE"
                    })
                    break
                else:
                    # Strip spaces and compare normalized output for equality
                    raw_user_out = proc.stdout.strip()
                    user_output_norm = raw_user_out.replace(" ", "").replace("\r", "")
                    expected_norm = tc.expected_output.strip().replace(" ", "").replace("\r", "")
                    passed = user_output_norm == expected_norm
                    
                    results.append({
                        "input": tc.input,
                        "expected": tc.expected_output.strip(),
                        "output": raw_user_out,
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
                    "error": "Time Limit Exceeded: Your solution exceeded the maximum allowed time limit.",
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
                    "error": sanitize_error_message(str(e), language),
                    "passed": False,
                    "verdict": "RE"
                })
                break
                
    return verdict, results
