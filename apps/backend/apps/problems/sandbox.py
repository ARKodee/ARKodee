import os
import sys
import ast
import re
import subprocess
import tempfile


def get_system_env():
    """
    Constructs an augmented PATH environment dictionary to locate NVM node binaries,
    Homebrew compilers, and system tools across different execution environments.
    """
    env = os.environ.copy()
    current_path = env.get("PATH", "")
    additional_paths = [
        "/usr/local/bin",
        "/opt/homebrew/bin",
    ]
    home_dir = os.path.expanduser("~")
    nvm_node_dir = os.path.join(home_dir, ".nvm", "versions", "node")
    if os.path.exists(nvm_node_dir):
        try:
            for version in os.listdir(nvm_node_dir):
                bin_path = os.path.join(nvm_node_dir, version, "bin")
                if os.path.exists(bin_path):
                    additional_paths.append(bin_path)
        except Exception:
            pass

    for p in additional_paths:
        if p not in current_path:
            current_path = f"{p}:{current_path}"
    env["PATH"] = current_path
    return env


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


def compare_outputs(user_output, expected_output, is_case_insensitive=False):
    """
    Smart output evaluator that compares user output against expected output.
    Supports:
      1. Exact string & whitespace normalized equality.
      2. Quoted vs unquoted string matching ("hello" vs hello).
      3. Boolean equivalence (true/True, false/False).
      4. Case-insensitive text matching for case-insensitive string problems.
      5. Structural JSON/AST list/dict equality.
    """
    if user_output is None or expected_output is None:
        return False

    u_raw = str(user_output).strip()
    e_raw = str(expected_output).strip()

    # 1. Exact string match
    if u_raw == e_raw:
        return True

    # 2. Unquoted string match
    def unquote(s):
        if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
            return s[1:-1].strip()
        return s

    u_unquoted = unquote(u_raw)
    e_unquoted = unquote(e_raw)
    if u_unquoted == e_unquoted:
        return True

    # 3. Normalized whitespace match
    u_norm = u_unquoted.replace(" ", "").replace("\r", "")
    e_norm = e_unquoted.replace(" ", "").replace("\r", "")
    if u_norm == e_norm:
        return True

    # 4. Boolean equivalence
    u_lower = u_norm.lower()
    e_lower = e_norm.lower()
    if e_lower in ["true", "false"]:
        return u_lower == e_lower

    # 5. Case-insensitive text match
    if is_case_insensitive or e_lower in ["true", "false", "valid", "invalid", "yes", "no"]:
        if u_lower == e_lower:
            return True

    # 6. Structural JSON/AST object match
    try:
        import ast
        u_obj = ast.literal_eval(u_unquoted.replace("null", "None").replace("true", "True").replace("false", "False"))
        e_obj = ast.literal_eval(e_unquoted.replace("null", "None").replace("true", "True").replace("false", "False"))
        if u_obj == e_obj:
            return True
    except Exception:
        pass

    # 7. Fallback lowercased string match for text answers
    if u_lower == e_lower:
        return True

    return False


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
            # Handle JS/JSON boolean, null, and ellipsis values
            normalized_val = (
                val_str.replace("true", "True")
                .replace("false", "False")
                .replace("null", "None")
                .replace("undefined", "None")
                .replace("...", "0")
            )
            parsed_obj = ast.literal_eval(normalized_val)
        except Exception:
            parsed_obj = val_str
            
        if isinstance(parsed_obj, list):
            if len(parsed_obj) > 0 and isinstance(parsed_obj[0], list):
                rows = len(parsed_obj)
                cols = len(parsed_obj[0]) if parsed_obj[0] is not None else 0
                matrix_str = f"{rows} {cols}\n"
                row_strs = []
                for row in parsed_obj:
                    if isinstance(row, list):
                        row_strs.append(" ".join("null" if elem is None else str(elem) for elem in row))
                    else:
                        row_strs.append("null" if row is None else str(row))
                matrix_str += "\n".join(row_strs)
                formatted_parts.append(matrix_str)
            else:
                size = len(parsed_obj)
                array_str = f"{size}\n" + " ".join("null" if elem is None else str(elem) for elem in parsed_obj)
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
        if "run_driver()" in line or "next_token()" in line or "_run_driver()" in line or "DriverMain.java" in line or "DriverMain" in line:
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
            java_read_lines.append(f"int {p_name} = sc.hasNextInt() ? sc.nextInt() : 0;")
            call_args.append(p_name)
        elif p_type_norm in ["str", "String"]:
            java_read_lines.append(f"String {p_name} = sc.hasNext() ? sc.next() : \"\";")
            call_args.append(p_name)
        elif p_type_norm in ["bool", "boolean"]:
            java_read_lines.append(f"boolean {p_name} = sc.hasNext() ? sc.next().equals(\"1\") : false;")
            call_args.append(p_name)
        elif p_type_norm in ["float", "double"]:
            java_read_lines.append(f"double {p_name} = sc.hasNextDouble() ? sc.nextDouble() : 0.0;")
            call_args.append(p_name)
        elif p_type_norm == "List[int]":
            java_read_lines.append(
                f"int {p_name}_size = sc.hasNextInt() ? sc.nextInt() : 0;\n"
                f"        int[] {p_name} = new int[{p_name}_size];\n"
                f"        for (int i = 0; i < {p_name}_size; i++) {p_name}[i] = sc.hasNextInt() ? sc.nextInt() : 0;"
            )
            call_args.append(p_name)
        elif p_type_norm == "List[List[int]]":
            java_read_lines.append(
                f"int {p_name}_rows = sc.hasNextInt() ? sc.nextInt() : 0;\n"
                f"        int {p_name}_cols = sc.hasNextInt() ? sc.nextInt() : 0;\n"
                f"        int[][] {p_name} = new int[{p_name}_rows][{p_name}_cols];\n"
                f"        for (int r = 0; r < {p_name}_rows; r++) {{\n"
                f"            for (int c = 0; c < {p_name}_cols; c++) {{\n"
                f"                {p_name}[r][c] = sc.hasNextInt() ? sc.nextInt() : 0;\n"
                f"            }}\n"
                f"        }}"
            )
            call_args.append(p_name)
        elif "TreeNode" in p_type_norm:
            java_read_lines.append(f"TreeNode {p_name} = sc.hasNext() ? buildTree(sc.next()) : null;")
            call_args.append(p_name)
        elif "ListNode" in p_type_norm:
            java_read_lines.append(f"ListNode {p_name} = sc.hasNext() ? buildList(sc.next()) : null;")
            call_args.append(p_name)
        else:
            java_read_lines.append(f"int {p_name} = sc.hasNextInt() ? sc.nextInt() : 0;")
            call_args.append(p_name)
            
    read_block = "\n        ".join(java_read_lines)
    args_str = ", ".join(call_args)
    
    ret_type_norm = ret_type.strip().replace(" ", "")
    if ret_type_norm.startswith("Optional[") and ret_type_norm.endswith("]"):
        ret_type_norm = ret_type_norm[9:-1]
        
    if ret_type_norm in ["List[int]", "int[]"]:
        print_statement = "System.out.println(Arrays.toString(ans));"
    elif "TreeNode" in ret_type_norm:
        print_statement = "System.out.println(ans != null ? ans.val : \"null\");"
    else:
        print_statement = "System.out.println(ans);"
        
    driver_code = (
        "\nimport java.util.*;\n\n"
        "class TreeNode {\n"
        "    int val;\n"
        "    TreeNode left, right;\n"
        "    TreeNode(int val) { this.val = val; }\n"
        "}\n\n"
        "class ListNode {\n"
        "    int val;\n"
        "    ListNode next;\n"
        "    ListNode(int val) { this.val = val; }\n"
        "}\n\n"
        "public class DriverMain {\n"
        "    private static TreeNode buildTree(String s) {\n"
        "        if (s == null || s.equals(\"null\") || s.isEmpty()) return null;\n"
        "        try {\n"
        "            String[] parts = s.replace(\"[\", \"\").replace(\"]\", \"\").split(\",\");\n"
        "            if (parts.length == 0 || parts[0].trim().isEmpty()) return null;\n"
        "            TreeNode root = new TreeNode(Integer.parseInt(parts[0].trim()));\n"
        "            Queue<TreeNode> q = new LinkedList<>();\n"
        "            q.add(root);\n"
        "            int i = 1;\n"
        "            while (!q.isEmpty() && i < parts.length) {\n"
        "                TreeNode curr = q.poll();\n"
        "                if (i < parts.length && !parts[i].trim().equals(\"null\")) {\n"
        "                    curr.left = new TreeNode(Integer.parseInt(parts[i].trim()));\n"
        "                    q.add(curr.left);\n"
        "                }\n"
        "                i++;\n"
        "                if (i < parts.length && !parts[i].trim().equals(\"null\")) {\n"
        "                    curr.right = new TreeNode(Integer.parseInt(parts[i].trim()));\n"
        "                    q.add(curr.right);\n"
        "                }\n"
        "                i++;\n"
        "            }\n"
        "            return root;\n"
        "        } catch (Exception e) { return null; }\n"
        "    }\n\n"
        "    private static ListNode buildList(String s) {\n"
        "        if (s == null || s.equals(\"null\") || s.isEmpty()) return null;\n"
        "        try {\n"
        "            String[] parts = s.replace(\"[\", \"\").replace(\"]\", \"\").split(\",\");\n"
        "            ListNode dummy = new ListNode(0);\n"
        "            ListNode curr = dummy;\n"
        "            for (String p : parts) {\n"
        "                if (!p.trim().isEmpty()) {\n"
        "                    curr.next = new ListNode(Integer.parseInt(p.trim()));\n"
        "                    curr = curr.next;\n"
        "                }\n"
        "            }\n"
        "            return dummy.next;\n"
        "        } catch (Exception e) { return null; }\n"
        "    }\n\n"
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
            cpp_read_lines.append(f"int {p_name} = 0; cin >> {p_name};")
            call_args.append(p_name)
        elif p_type_norm in ["str", "string"]:
            cpp_read_lines.append(f"string {p_name}; cin >> {p_name};")
            call_args.append(p_name)
        elif p_type_norm == "bool":
            cpp_read_lines.append(f"int {p_name}_b = 0; cin >> {p_name}_b; bool {p_name} = ({p_name}_b != 0);")
            call_args.append(p_name)
        elif p_type_norm in ["float", "double"]:
            cpp_read_lines.append(f"double {p_name} = 0.0; cin >> {p_name};")
            call_args.append(p_name)
        elif p_type_norm == "List[int]":
            cpp_read_lines.append(
                f"int {p_name}_size = 0; cin >> {p_name}_size;\n"
                f"    vector<int> {p_name}({p_name}_size);\n"
                f"    for (int i = 0; i < {p_name}_size; i++) cin >> {p_name}[i];"
            )
            call_args.append(p_name)
        elif p_type_norm == "List[List[int]]":
            cpp_read_lines.append(
                f"int {p_name}_rows = 0; cin >> {p_name}_rows;\n"
                f"    int {p_name}_cols = 0; cin >> {p_name}_cols;\n"
                f"    vector<vector<int>> {p_name}({p_name}_rows, vector<int>({p_name}_cols));\n"
                f"    for (int r = 0; r < {p_name}_rows; r++) {{\n"
                f"        for (int c = 0; c < {p_name}_cols; c++) {{\n"
                f"            cin >> {p_name}[r][c];\n"
                f"        }}\n"
                f"    }}"
            )
            call_args.append(p_name)
        elif "TreeNode" in p_type_norm:
            cpp_read_lines.append(f"string {p_name}_s; cin >> {p_name}_s; TreeNode* {p_name} = buildTree({p_name}_s);")
            call_args.append(p_name)
        elif "ListNode" in p_type_norm:
            cpp_read_lines.append(f"string {p_name}_s; cin >> {p_name}_s; ListNode* {p_name} = buildList({p_name}_s);")
            call_args.append(p_name)
        else:
            cpp_read_lines.append(f"int {p_name} = 0; cin >> {p_name};")
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
    elif "TreeNode" in ret_type_norm:
        print_code = "cout << (ans != nullptr ? ans->val : 0) << endl;"
    else:
        print_code = "cout << ans << endl;"
        
    driver_code = (
        "\n#include <iostream>\n"
        "#include <vector>\n"
        "#include <string>\n"
        "#include <queue>\n"
        "#include <sstream>\n"
        "using namespace std;\n\n"
        "struct TreeNode {\n"
        "    int val;\n"
        "    TreeNode *left;\n"
        "    TreeNode *right;\n"
        "    TreeNode(int x) : val(x), left(NULL), right(NULL) {}\n"
        "};\n\n"
        "struct ListNode {\n"
        "    int val;\n"
        "    ListNode *next;\n"
        "    ListNode(int x) : val(x), next(NULL) {}\n"
        "};\n\n"
        "TreeNode* buildTree(string s) {\n"
        "    if (s.empty() || s == \"null\") return NULL;\n"
        "    try {\n"
        "        string clean = \"\";\n"
        "        for (char c : s) if (c != '[' && c != ']') clean += c;\n"
        "        stringstream ss(clean);\n"
        "        string item;\n"
        "        if (!getline(ss, item, ',')) return NULL;\n"
        "        TreeNode* root = new TreeNode(stoi(item));\n"
        "        queue<TreeNode*> q;\n"
        "        q.push(root);\n"
        "        while (!q.empty() && getline(ss, item, ',')) {\n"
        "            TreeNode* node = q.front(); q.pop();\n"
        "            if (item != \"null\") {\n"
        "                node->left = new TreeNode(stoi(item));\n"
        "                q.push(node->left);\n"
        "            }\n"
        "            if (getline(ss, item, ',') && item != \"null\") {\n"
        "                node->right = new TreeNode(stoi(item));\n"
        "                q.push(node->right);\n"
        "            }\n"
        "        }\n"
        "        return root;\n"
        "    } catch (...) { return NULL; }\n"
        "}\n\n"
        "ListNode* buildList(string s) {\n"
        "    if (s.empty() || s == \"null\") return NULL;\n"
        "    try {\n"
        "        string clean = \"\";\n"
        "        for (char c : s) if (c != '[' && c != ']') clean += c;\n"
        "        stringstream ss(clean);\n"
        "        string item;\n"
        "        ListNode dummy(0);\n"
        "        ListNode* curr = &dummy;\n"
        "        while (getline(ss, item, ',')) {\n"
        "            if (!item.empty()) {\n"
        "                curr->next = new ListNode(stoi(item));\n"
        "                curr = curr->next;\n"
        "            }\n"
        "        }\n"
        "        return dummy.next;\n"
        "    } catch (...) { return NULL; }\n"
        "}\n\n"
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
            js_read_lines.append(f"let {p_name} = parseInt(nextToken() || '0', 10);")
            call_args.append(p_name)
        elif p_type_norm in ["str", "string"]:
            js_read_lines.append(f"let {p_name} = nextToken() || '';")
            call_args.append(p_name)
        elif p_type_norm in ["bool", "boolean"]:
            js_read_lines.append(f"let {p_name} = (nextToken() || '0') === '1';")
            call_args.append(p_name)
        elif p_type_norm in ["float", "double"]:
            js_read_lines.append(f"let {p_name} = parseFloat(nextToken() || '0');")
            call_args.append(p_name)
        elif p_type_norm == "List[int]":
            js_read_lines.append(
                f"let {p_name}_size = parseInt(nextToken() || '0', 10);\n"
                f"    let {p_name} = [];\n"
                f"    for (let i = 0; i < {p_name}_size; i++) {p_name}.push(parseInt(nextToken() || '0', 10));"
            )
            call_args.append(p_name)
        elif p_type_norm == "List[List[int]]":
            js_read_lines.append(
                f"let {p_name}_rows = parseInt(nextToken() || '0', 10);\n"
                f"    let {p_name}_cols = parseInt(nextToken() || '0', 10);\n"
                f"    let {p_name} = [];\n"
                f"    for (let r = 0; r < {p_name}_rows; r++) {{\n"
                f"        let row = [];\n"
                f"        for (let c = 0; c < {p_name}_cols; c++) {{\n"
                f"            row.push(parseInt(nextToken() || '0', 10));\n"
                f"        }}\n"
                f"        {p_name}.push(row);\n"
                f"    }}"
            )
            call_args.append(p_name)
        elif "TreeNode" in p_type_norm:
            js_read_lines.append(f"let {p_name} = buildTree(nextToken());")
            call_args.append(p_name)
        elif "ListNode" in p_type_norm:
            js_read_lines.append(f"let {p_name} = buildList(nextToken());")
            call_args.append(p_name)
        else:
            js_read_lines.append(f"let {p_name} = parseInt(nextToken() || '0', 10);")
            call_args.append(p_name)
            
    read_block = "\n    ".join(js_read_lines)
    args_str = ", ".join(call_args)
    
    driver_code = (
        "\nconst fs = require('fs');\n"
        "function TreeNode(val, left, right) {\n"
        "    this.val = (val===undefined ? 0 : val);\n"
        "    this.left = (left===undefined ? null : left);\n"
        "    this.right = (right===undefined ? null : right);\n"
        "}\n\n"
        "function ListNode(val, next) {\n"
        "    this.val = (val===undefined ? 0 : val);\n"
        "    this.next = (next===undefined ? null : next);\n"
        "}\n\n"
        "function buildTree(s) {\n"
        "    if (!s || s === 'null') return null;\n"
        "    try {\n"
        "        let arr = JSON.parse(s);\n"
        "        if (!Array.isArray(arr) || arr.length === 0) return null;\n"
        "        let root = new TreeNode(arr[0]);\n"
        "        let q = [root];\n"
        "        let i = 1;\n"
        "        while (q.length > 0 && i < arr.length) {\n"
        "            let curr = q.shift();\n"
        "            if (i < arr.length && arr[i] !== null) {\n"
        "                curr.left = new TreeNode(arr[i]);\n"
        "                q.push(curr.left);\n"
        "            }\n"
        "            i++;\n"
        "            if (i < arr.length && arr[i] !== null) {\n"
        "                curr.right = new TreeNode(arr[i]);\n"
        "                q.push(curr.right);\n"
        "            }\n"
        "            i++;\n"
        "        }\n"
        "        return root;\n"
        "    } catch(e) { return null; }\n"
        "}\n\n"
        "function buildList(s) {\n"
        "    if (!s || s === 'null') return null;\n"
        "    try {\n"
        "        let arr = JSON.parse(s);\n"
        "        let dummy = new ListNode(0);\n"
        "        let curr = dummy;\n"
        "        for (let v of arr) { curr.next = new ListNode(v); curr = curr.next; }\n"
        "        return dummy.next;\n"
        "    } catch(e) { return null; }\n"
        "}\n\n"
        "const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n"
        "function nextToken() { return tokens.length > 0 ? tokens.shift() : null; }\n"
        "if (tokens.length > 0 && tokens[0] !== '') {\n"
        f"    {read_block}\n"
        f"    let solver = typeof Solution !== 'undefined' ? new Solution() : null;\n"
        f"    let ans = solver ? solver.{func_name}({args_str}) : {func_name}({args_str});\n"
        "    if (ans && typeof ans === 'object' && 'val' in ans) ans = ans.val;\n"
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
            py_read_lines.append(f"try:\n        {p_name} = int(next_token())\n    except Exception:\n        {p_name} = 0")
            call_args.append(p_name)
        elif p_type_norm in ["str", "string"]:
            py_read_lines.append(f"{p_name} = next_token(default='')")
            call_args.append(p_name)
        elif p_type_norm == "bool":
            py_read_lines.append(f"{p_name} = next_token(default='0') == '1'")
            call_args.append(p_name)
        elif p_type_norm in ["float", "double"]:
            py_read_lines.append(f"try:\n        {p_name} = float(next_token())\n    except Exception:\n        {p_name} = 0.0")
            call_args.append(p_name)
        elif p_type_norm == "List[int]":
            py_read_lines.append(
                f"try:\n"
                f"        {p_name}_size = int(next_token())\n"
                f"        {p_name} = [int(next_token()) for _ in range({p_name}_size)]\n"
                f"    except Exception:\n"
                f"        {p_name} = []"
            )
            call_args.append(p_name)
        elif p_type_norm == "List[str]":
            py_read_lines.append(
                f"try:\n"
                f"        {p_name}_size = int(next_token())\n"
                f"        {p_name} = [next_token() for _ in range({p_name}_size)]\n"
                f"    except Exception:\n"
                f"        {p_name} = []"
            )
            call_args.append(p_name)
        elif p_type_norm == "List[List[int]]":
            py_read_lines.append(
                f"try:\n"
                f"        {p_name}_rows = int(next_token())\n"
                f"        {p_name}_cols = int(next_token())\n"
                f"        {p_name} = []\n"
                f"        for _ in range({p_name}_rows):\n"
                f"            {p_name}.append([int(next_token()) for _ in range({p_name}_cols)])\n"
                f"    except Exception:\n"
                f"        {p_name} = []"
            )
            call_args.append(p_name)
        elif "TreeNode" in p_type_norm:
            py_read_lines.append(
                f"try:\n"
                f"        tok = next_token()\n"
                f"        if tok and tok.isdigit():\n"
                f"            {p_name} = find_node_by_val(root_tree, int(tok)) if 'root_tree' in locals() and root_tree else TreeNode(int(tok))\n"
                f"        else:\n"
                f"            {p_name} = build_tree(tok)\n"
                f"            if 'root_tree' not in locals(): root_tree = {p_name}\n"
                f"    except Exception:\n"
                f"        {p_name} = None"
            )
            call_args.append(p_name)
        elif "ListNode" in p_type_norm:
            py_read_lines.append(
                f"try:\n"
                f"        tok = next_token()\n"
                f"        {p_name} = build_list(tok)\n"
                f"    except Exception:\n"
                f"        {p_name} = None"
            )
            call_args.append(p_name)
        else:
            py_read_lines.append(f"try:\n        {p_name} = int(next_token())\n    except Exception:\n        {p_name} = 0")
            call_args.append(p_name)
            
    read_block = "\n    ".join(py_read_lines)
    args_str = ", ".join(call_args)
    
    solver_inst = "solver = Solution()" if has_class else ""
    call_expr = f"solver.{func_name}({args_str})" if has_class else f"{func_name}({args_str})"

    driver_code = (
        "\nimport sys\n"
        "import json\n\n"
        "class TreeNode:\n"
        "    def __init__(self, val=0, left=None, right=None):\n"
        "        self.val = val\n"
        "        self.left = left\n"
        "        self.right = right\n\n"
        "class ListNode:\n"
        "    def __init__(self, val=0, next=None):\n"
        "        self.val = val\n"
        "        self.next = next\n\n"
        "def build_tree(vals_str):\n"
        "    if not vals_str or vals_str == 'null' or vals_str == 'None': return None\n"
        "    try:\n"
        "        if isinstance(vals_str, str) and (vals_str.startswith('[') or ',' in vals_str):\n"
        "            import ast\n"
        "            raw_list = ast.literal_eval(vals_str.replace('null', 'None'))\n"
        "        else:\n"
        "            raw_list = [int(vals_str)]\n"
        "        if not raw_list: return None\n"
        "        root = TreeNode(raw_list[0])\n"
        "        queue = [root]\n"
        "        i = 1\n"
        "        while queue and i < len(raw_list):\n"
        "            curr = queue.pop(0)\n"
        "            if i < len(raw_list) and raw_list[i] is not None:\n"
        "                curr.left = TreeNode(raw_list[i])\n"
        "                queue.append(curr.left)\n"
        "            i += 1\n"
        "            if i < len(raw_list) and raw_list[i] is not None:\n"
        "                curr.right = TreeNode(raw_list[i])\n"
        "                queue.append(curr.right)\n"
        "            i += 1\n"
        "        return root\n"
        "    except Exception:\n"
        "        return None\n\n"
        "def find_node_by_val(root, val):\n"
        "    if not root: return None\n"
        "    if root.val == val: return root\n"
        "    return find_node_by_val(root.left, val) or find_node_by_val(root.right, val)\n\n"
        "def build_list(vals_str):\n"
        "    if not vals_str or vals_str == 'null': return None\n"
        "    try:\n"
        "        import ast\n"
        "        raw_list = ast.literal_eval(vals_str) if isinstance(vals_str, str) else [vals_str]\n"
        "        dummy = ListNode(0)\n"
        "        curr = dummy\n"
        "        for v in raw_list:\n"
        "            curr.next = ListNode(v)\n"
        "            curr = curr.next\n"
        "        return dummy.next\n"
        "    except Exception:\n"
        "        return None\n\n"
        "def serialize_ans(ans):\n"
        "    if isinstance(ans, TreeNode): return ans.val\n"
        "    if isinstance(ans, ListNode):\n"
        "        res = []\n"
        "        curr = ans\n"
        "        while curr:\n"
        "            res.append(curr.val)\n"
        "            curr = curr.next\n"
        "        return res\n"
        "    return ans\n\n"
        "def _run_driver():\n"
        "    input_data = sys.stdin.read().split()\n"
        "    iterator = iter(input_data)\n"
        "    def next_token(default=None):\n"
        "        try:\n"
        "            return next(iterator)\n"
        "        except StopIteration:\n"
        "            return default\n"
        f"    {read_block}\n"
        f"    {solver_inst}\n"
        f"    ans = {call_expr}\n"
        "    print(json.dumps(serialize_ans(ans)))\n\n"
        "if __name__ == '__main__':\n"
        "    _run_driver()\n"
    )
    return driver_code


def run_code_in_sandbox(code, language, test_cases, time_limit_ms, starter_code=None, stop_on_first_fail=False):
    results = []
    verdict = "AC"
    compile_error = None
    
    if language not in ["python", "javascript", "java", "cpp"]:
        return "CE", [], f"Language '{language}' is not supported in the sandbox runner."
        
    # Inspect user code directly first, fallback to starter code signature if needed
    details = extract_user_python_details(code)
    if not details and starter_code:
        details = extract_user_python_details(starter_code)

    # Check if user code already contains its own main/runner entry point
    is_standalone_cpp = "int main(" in code
    is_standalone_java = "public static void main(" in code or "static void main(" in code
    is_standalone_py = "__name__ == '__main__'" in code or "__name__=='__main__'" in code
    is_standalone_js = "fs.readFileSync" in code or "readline" in code

    system_env = get_system_env()

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
                    env=system_env,
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if compile_proc.returncode != 0:
                    clean_err = sanitize_error_message(compile_proc.stderr or compile_proc.stdout, "java")
                    return "CE", [], clean_err
            except FileNotFoundError:
                return "CE", [], "Java SDK ('javac') is not installed on this local server. Please switch your language selector to Python 3 or JavaScript, or install JDK to run Java code."

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
                    env=system_env,
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if compile_proc.returncode != 0:
                    clean_err = sanitize_error_message(compile_proc.stderr or compile_proc.stdout, "cpp")
                    return "CE", [], clean_err
                exec_cmd = [os.path.join(temp_dir, exe_name)]
            except FileNotFoundError:
                return "CE", [], "C++ compiler ('g++') is not installed on this local server. Please switch your language selector to Python 3 or JavaScript, or install GCC/G++ to run C++ code."

        elif language == "python":
            src_path = os.path.join(temp_dir, "solution.py")
            if details and not is_standalone_py:
                driver_code = generate_py_driver(details["func_name"], details["params"], details["ret_type"], details["has_class"])
                combined_code = "from typing import *\n" + code + "\n" + driver_code
                wrapper_line_count = 1
            else:
                combined_code = code
                
            with open(src_path, "w", encoding="utf-8") as f:
                f.write(combined_code)
            exec_cmd = [sys.executable, src_path]

        elif language == "javascript":
            try:
                subprocess.run(["node", "--version"], env=system_env, capture_output=True)
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
                return "CE", [], "Node.js runtime is not installed on this local server. Please install Node.js to run JavaScript solutions."

        # Execution Stage across all Test Cases
        for index, tc in enumerate(test_cases):
            try:
                formatted_input = format_input_for_sandbox(tc.input)
                timeout_sec = max(1, time_limit_ms / 1000.0)
                proc = subprocess.run(
                    exec_cmd,
                    cwd=temp_dir,
                    env=system_env,
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
                else:
                    raw_user_out = proc.stdout.strip()
                    passed = compare_outputs(raw_user_out, tc.expected_output)
                    
                    results.append({
                        "input": tc.input,
                        "expected": tc.expected_output.strip(),
                        "output": raw_user_out,
                        "passed": passed,
                        "verdict": "AC" if passed else "WA"
                    })
                    if not passed:
                        verdict = "WA"
                        if stop_on_first_fail:
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
                
    return verdict, results, compile_error
