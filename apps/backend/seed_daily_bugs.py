import os
import sys
import django
import uuid
from datetime import date, timedelta

# Setup Django Environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.problems.models import DailyBug

BUGS_DATA = [
    # ── 1. Aug 5, 2026 ────────────────────────────────────────────────────────
    {
        "date": date(2026, 8, 5),
        "title": "Binary Search Upper Boundary Overshoot",
        "category": "algorithms",
        "description": "The binary search implementation hangs in an infinite loop when searching for targets that are smaller than the middle element. Find and fix the boundary update within 1 line.",
        "starter_codes": {
            "python": "def binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] > target:\n            high = mid\n        else:\n            low = mid + 1\n    return -1",
            "cpp": "#include <vector>\nusing namespace std;\n\nint binarySearch(vector<int>& arr, int target) {\n    int low = 0, high = arr.size() - 1;\n    while (low <= high) {\n        int mid = low + (high - low) / 2;\n        if (arr[mid] == target) return mid;\n        else if (arr[mid] > target) high = mid;\n        else low = mid + 1;\n    }\n    return -1;\n}",
            "java": "public class Solution {\n    public static int binarySearch(int[] arr, int target) {\n        int low = 0, high = arr.length - 1;\n        while (low <= high) {\n            int mid = low + (high - low) / 2;\n            if (arr[mid] == target) return mid;\n            else if (arr[mid] > target) high = mid;\n            else low = mid + 1;\n        }\n        return -1;\n    }\n}",
            "javascript": "function binarySearch(arr, target) {\n    let low = 0, high = arr.length - 1;\n    while (low <= high) {\n        let mid = Math.floor((low + high) / 2);\n        if (arr[mid] === target) return mid;\n        else if (arr[mid] > target) high = mid;\n        else low = mid + 1;\n    }\n    return -1;\n}"
        },
        "sample_input": "[1, 3, 5, 7, 9]\n3",
        "expected_output": "1",
        "examples": [
            {"input": "arr = [1, 3, 5, 7, 9], target = 3", "output": "1", "explanation": "Target 3 is at index 1."}
        ],
        "test_cases_json": [
            {"input": "[1, 3, 5, 7, 9]\n3", "expected_output": "1"},
            {"input": "[1, 3, 5, 7, 9]\n1", "expected_output": "0"},
            {"input": "[1, 3, 5, 7, 9]\n9", "expected_output": "4"},
            {"input": "[1, 3, 5, 7, 9]\n6", "expected_output": "-1"},
            {"input": "[2, 4, 6, 8, 10, 12]\n4", "expected_output": "1"}
        ],
        "line_budget": 1,
        "xp_reward": 100,
        "time_limit_ms": 2000,
    },

    # ── 2. Aug 6, 2026 ────────────────────────────────────────────────────────
    {
        "date": date(2026, 8, 6),
        "title": "Prefix Sum Range Exclusion",
        "category": "arrays",
        "description": "The range sum query calculator omits the boundary element at the right index. Fix the prefix subtraction logic within 1 line.",
        "starter_codes": {
            "python": "def range_sum(arr, left, right):\n    prefix = [0]\n    for x in arr:\n        prefix.append(prefix[-1] + x)\n    return prefix[right] - prefix[left]",
            "cpp": "#include <vector>\nusing namespace std;\n\nint rangeSum(vector<int>& arr, int left, int right) {\n    vector<int> prefix = {0};\n    for (int x : arr) prefix.push_back(prefix.back() + x);\n    return prefix[right] - prefix[left];\n}",
            "java": "public class Solution {\n    public static int rangeSum(int[] arr, int left, int right) {\n        int[] prefix = new int[arr.length + 1];\n        for (int i = 0; i < arr.length; i++) prefix[i + 1] = prefix[i] + arr[i];\n        return prefix[right] - prefix[left];\n    }\n}",
            "javascript": "function rangeSum(arr, left, right) {\n    let prefix = [0];\n    for (let x of arr) prefix.push(prefix[prefix.length - 1] + x);\n    return prefix[right] - prefix[left];\n}"
        },
        "sample_input": "[2, 4, 6, 8, 10]\n1\n3",
        "expected_output": "18",
        "examples": [
            {"input": "arr = [2, 4, 6, 8, 10], left = 1, right = 3", "output": "18", "explanation": "Subarray [4, 6, 8] sum is 18."}
        ],
        "test_cases_json": [
            {"input": "[2, 4, 6, 8, 10]\n1\n3", "expected_output": "18"},
            {"input": "[1, 2, 3, 4, 5]\n0\n4", "expected_output": "15"},
            {"input": "[5, 10, 15]\n0\n0", "expected_output": "5"},
            {"input": "[10, -2, 3, 7]\n1\n2", "expected_output": "1"}
        ],
        "line_budget": 1,
        "xp_reward": 150,
    },

    # ── 3. Aug 7, 2026 ────────────────────────────────────────────────────────
    {
        "date": date(2026, 8, 7),
        "title": "Rotated Array Minimum Search Direction",
        "category": "algorithms",
        "description": "When searching for the minimum element in a rotated sorted array, the binary search comparison logic skips the minimum value on un-rotated segments. Fix it in 1 line.",
        "starter_codes": {
            "python": "def find_min(nums):\n    left, right = 0, len(nums) - 1\n    while left < right:\n        mid = (left + right) // 2\n        if nums[mid] > nums[left]:\n            left = mid + 1\n        else:\n            right = mid\n    return nums[left]",
            "cpp": "#include <vector>\nusing namespace std;\n\nint findMin(vector<int>& nums) {\n    int left = 0, right = nums.size() - 1;\n    while (left < right) {\n        int mid = left + (right - left) / 2;\n        if (nums[mid] > nums[left]) left = mid + 1;\n        else right = mid;\n    }\n    return nums[left];\n}",
            "java": "public class Solution {\n    public static int findMin(int[] nums) {\n        int left = 0, right = nums.length - 1;\n        while (left < right) {\n            int mid = left + (right - left) / 2;\n            if (nums[mid] > nums[left]) left = mid + 1;\n            else right = mid;\n        }\n        return nums[left];\n    }\n}",
            "javascript": "function findMin(nums) {\n    let left = 0, right = nums.length - 1;\n    while (left < right) {\n        let mid = Math.floor((left + right) / 2);\n        if (nums[mid] > nums[left]) left = mid + 1;\n        else right = mid;\n    }\n    return nums[left];\n}"
        },
        "sample_input": "[3, 4, 5, 1, 2]",
        "expected_output": "1",
        "examples": [
            {"input": "nums = [3, 4, 5, 1, 2]", "output": "1", "explanation": "The minimum value in the rotated array is 1."}
        ],
        "test_cases_json": [
            {"input": "[3, 4, 5, 1, 2]", "expected_output": "1"},
            {"input": "[4, 5, 6, 7, 0, 1, 2]", "expected_output": "0"},
            {"input": "[11, 13, 15, 17]", "expected_output": "11"},
            {"input": "[2, 1]", "expected_output": "1"}
        ],
        "line_budget": 1,
        "xp_reward": 150,
    },

    # ── 4. Aug 8, 2026 (⭐ FEATURED BEST MIND TWISTER BUG) ─────────────────────
    {
        "date": date(2026, 8, 8),
        "title": "Sliding Window Pointer Backtracking Trap",
        "category": "strings",
        "description": "Find the length of the longest substring without repeating characters. When duplicate characters appear before the active window start, the left pointer erroneously jumps backwards into previously processed sub-windows. Fix this subtle sliding window bug within 1 line.",
        "starter_codes": {
            "python": "def length_of_longest_substring(s):\n    char_map = {}\n    left = max_len = 0\n    for right, char in enumerate(s):\n        if char in char_map:\n            left = char_map[char] + 1\n        char_map[char] = right\n        max_len = max(max_len, right - left + 1)\n    return max_len",
            "cpp": "#include <string>\n#include <unordered_map>\n#include <algorithm>\nusing namespace std;\n\nint lengthOfLongestSubstring(string s) {\n    unordered_map<char, int> charMap;\n    int left = 0, maxLen = 0;\n    for (int right = 0; right < s.length(); right++) {\n        if (charMap.count(s[right])) {\n            left = charMap[s[right]] + 1;\n        }\n        charMap[s[right]] = right;\n        maxLen = max(maxLen, right - left + 1);\n    }\n    return maxLen;\n}",
            "java": "import java.util.*;\n\npublic class Solution {\n    public static int lengthOfLongestSubstring(String s) {\n        Map<Character, Integer> charMap = new HashMap<>();\n        int left = 0, maxLen = 0;\n        for (int right = 0; right < s.length(); right++) {\n            char c = s.charAt(right);\n            if (charMap.containsKey(c)) {\n                left = charMap.get(c) + 1;\n            }\n            charMap.put(c, right);\n            maxLen = Math.max(maxLen, right - left + 1);\n        }\n        return maxLen;\n    }\n}",
            "javascript": "function lengthOfLongestSubstring(s) {\n    let charMap = new Map();\n    let left = 0, maxLen = 0;\n    for (let right = 0; right < s.length; right++) {\n        let c = s[right];\n        if (charMap.has(c)) {\n            left = charMap.get(c) + 1;\n        }\n        charMap.set(c, right);\n        maxLen = Math.max(maxLen, right - left + 1);\n    }\n    return maxLen;\n}"
        },
        "sample_input": "abba",
        "expected_output": "2",
        "examples": [
            {"input": "s = \"abba\"", "output": "2", "explanation": "Longest non-repeating substring is \"ab\" or \"ba\" of length 2."}
        ],
        "test_cases_json": [
            {"input": "abba", "expected_output": "2"},
            {"input": "abcabcbb", "expected_output": "3"},
            {"input": "bbbbb", "expected_output": "1"},
            {"input": "pwwkew", "expected_output": "3"},
            {"input": "tmmzuxt", "expected_output": "5"}
        ],
        "line_budget": 1,
        "xp_reward": 250,
    },

    # ── 5. Aug 9, 2026 ────────────────────────────────────────────────────────
    {
        "date": date(2026, 8, 9),
        "title": "Encapsulated Interval Shrinking Flaw",
        "category": "arrays",
        "description": "The interval merger shrinks larger intervals when a smaller interval is fully encapsulated inside a larger one (e.g., [1, 10] and [2, 5]). Fix the boundary merge calculation in 1 line.",
        "starter_codes": {
            "python": "def merge_intervals(intervals):\n    intervals.sort(key=lambda x: x[0])\n    merged = [intervals[0]]\n    for current in intervals[1:]:\n        prev = merged[-1]\n        if current[0] > prev[1]:\n            merged.append(current)\n        else:\n            prev[1] = current[1]\n    return merged",
            "cpp": "#include <vector>\n#include <algorithm>\nusing namespace std;\n\nvector<vector<int>> mergeIntervals(vector<vector<int>>& intervals) {\n    sort(intervals.begin(), intervals.end());\n    vector<vector<int>> merged = {intervals[0]};\n    for (int i = 1; i < intervals.size(); i++) {\n        auto& prev = merged.back();\n        auto& current = intervals[i];\n        if (current[0] > prev[1]) {\n            merged.push_back(current);\n        } else {\n            prev[1] = current[1];\n        }\n    }\n    return merged;\n}",
            "java": "import java.util.*;\n\npublic class Solution {\n    public static int[][] mergeIntervals(int[][] intervals) {\n        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));\n        List<int[]> merged = new ArrayList<>();\n        merged.add(intervals[0]);\n        for (int i = 1; i < intervals.length; i++) {\n            int[] prev = merged.get(merged.size() - 1);\n            int[] current = intervals[i];\n            if (current[0] > prev[1]) {\n                merged.add(current);\n            } else {\n                prev[1] = current[1];\n            }\n        }\n        return merged.toArray(new int[merged.size()][]);\n    }\n}",
            "javascript": "function mergeIntervals(intervals) {\n    intervals.sort((a, b) => a[0] - b[0]);\n    let merged = [intervals[0]];\n    for (let i = 1; i < intervals.length; i++) {\n        let prev = merged[merged.length - 1];\n        let current = intervals[i];\n        if (current[0] > prev[1]) {\n            merged.push(current);\n        } else {\n            prev[1] = current[1];\n        }\n    }\n    return merged;\n}"
        },
        "sample_input": "[[1, 10], [2, 5]]",
        "expected_output": "[[1, 10]]",
        "examples": [
            {"input": "intervals = [[1, 10], [2, 5]]", "output": "[[1, 10]]", "explanation": "[2, 5] is inside [1, 10], so merged result should remain [1, 10]."}
        ],
        "test_cases_json": [
            {"input": "[[1, 10], [2, 5]]", "expected_output": "[[1, 10]]"},
            {"input": "[[1, 3], [2, 6], [8, 10]]", "expected_output": "[[1, 6], [8, 10]]"},
            {"input": "[[1, 4], [4, 5]]", "expected_output": "[[1, 5]]"}
        ],
        "line_budget": 1,
        "xp_reward": 150,
    },

    # ── 6. Aug 10, 2026 ───────────────────────────────────────────────────────
    {
        "date": date(2026, 8, 10),
        "title": "Two-Sum Self-Pairing Trap",
        "category": "arrays",
        "description": "Pre-populating the lookup map before array traversal allows an element to pair with ITSELF when target is double the element value. Fix the map build logic in 2 lines.",
        "starter_codes": {
            "python": "def two_sum(nums, target):\n    seen = {num: i for i, num in enumerate(nums)}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [i, seen[diff]]\n    return []",
            "cpp": "#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    unordered_map<int, int> seen;\n    for (int i = 0; i < nums.size(); i++) seen[nums[i]] = i;\n    for (int i = 0; i < nums.size(); i++) {\n        int diff = target - nums[i];\n        if (seen.count(diff)) return {i, seen[diff]};\n    }\n    return {};\n}",
            "java": "import java.util.*;\n\npublic class Solution {\n    public static int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> seen = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) seen.put(nums[i], i);\n        for (int i = 0; i < nums.length; i++) {\n            int diff = target - nums[i];\n            if (seen.containsKey(diff)) return new int[]{i, seen.get(diff)};\n        }\n        return new int[]{};\n    }\n}",
            "javascript": "function twoSum(nums, target) {\n    let seen = {};\n    nums.forEach((num, i) => seen[num] = i);\n    for (let i = 0; i < nums.length; i++) {\n        let diff = target - nums[i];\n        if (diff in seen) return [i, seen[diff]];\n    }\n    return [];\n}"
        },
        "sample_input": "[3, 2, 4]\n6",
        "expected_output": "[1, 2]",
        "examples": [
            {"input": "nums = [3, 2, 4], target = 6", "output": "[1, 2]", "explanation": "2 + 4 = 6 at indices 1 and 2."}
        ],
        "test_cases_json": [
            {"input": "[3, 2, 4]\n6", "expected_output": "[1, 2]"},
            {"input": "[2, 7, 11, 15]\n9", "expected_output": "[0, 1]"},
            {"input": "[3, 3]\n6", "expected_output": "[0, 1]"}
        ],
        "line_budget": 2,
        "xp_reward": 200,
    },

    # ── 7. Aug 11, 2026 ───────────────────────────────────────────────────────
    {
        "date": date(2026, 8, 11),
        "title": "Kadane's All-Negative Subarray Fallback",
        "category": "algorithms",
        "description": "Find the maximum sum of a contiguous subarray. When all numbers in the input array are negative, initializing max counters to 0 causes an incorrect result of 0. Fix in 1 line.",
        "starter_codes": {
            "python": "def max_sub_array(nums):\n    max_so_far = 0\n    curr_max = 0\n    for x in nums:\n        curr_max = max(x, curr_max + x)\n        max_so_far = max(max_so_far, curr_max)\n    return max_so_far",
            "cpp": "#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint maxSubArray(vector<int>& nums) {\n    int maxSoFar = 0, currMax = 0;\n    for (int x : nums) {\n        currMax = max(x, currMax + x);\n        maxSoFar = max(maxSoFar, currMax);\n    }\n    return maxSoFar;\n}",
            "java": "public class Solution {\n    public static int maxSubArray(int[] nums) {\n        int maxSoFar = 0, currMax = 0;\n        for (int x : nums) {\n            currMax = Math.max(x, currMax + x);\n            maxSoFar = Math.max(maxSoFar, currMax);\n        }\n        return maxSoFar;\n    }\n}",
            "javascript": "function maxSubArray(nums) {\n    let maxSoFar = 0, currMax = 0;\n    for (let x of nums) {\n        currMax = Math.max(x, currMax + x);\n        maxSoFar = Math.max(maxSoFar, currMax);\n    }\n    return maxSoFar;\n}"
        },
        "sample_input": "[-3, -1, -2]",
        "expected_output": "-1",
        "examples": [
            {"input": "nums = [-3, -1, -2]", "output": "-1", "explanation": "Maximum contiguous sum among all negative numbers is -1."}
        ],
        "test_cases_json": [
            {"input": "[-3, -1, -2]", "expected_output": "-1"},
            {"input": "[-2, 1, -3, 4, -1, 2, 1, -5, 4]", "expected_output": "6"},
            {"input": "[-5]", "expected_output": "-5"}
        ],
        "line_budget": 1,
        "xp_reward": 150,
    },

    # ── 8. Aug 12, 2026 ───────────────────────────────────────────────────────
    {
        "date": date(2026, 8, 12),
        "title": "3-Way Partition Pointer Skipping Bug",
        "category": "algorithms",
        "description": "Sort an array of 0s, 1s, and 2s in-place (Dutch National Flag). Incrementing mid pointer when swapping with high moves un-inspected elements past the scanner. Fix in 1 line.",
        "starter_codes": {
            "python": "def sort_colors(nums):\n    low, mid, high = 0, 0, len(nums) - 1\n    while mid <= high:\n        if nums[mid] == 0:\n            nums[low], nums[mid] = nums[mid], nums[low]\n            low += 1; mid += 1\n        elif nums[mid] == 1:\n            mid += 1\n        else:\n            nums[mid], nums[high] = nums[high], nums[mid]\n            high -= 1; mid += 1\n    return nums",
            "cpp": "#include <vector>\n#include <algorithm>\nusing namespace std;\n\nvector<int> sortColors(vector<int>& nums) {\n    int low = 0, mid = 0, high = nums.size() - 1;\n    while (mid <= high) {\n        if (nums[mid] == 0) swap(nums[low++], nums[mid++]);\n        else if (nums[mid] == 1) mid++;\n        else { swap(nums[mid++], nums[high--]); }\n    }\n    return nums;\n}",
            "java": "public class Solution {\n    public static int[] sortColors(int[] nums) {\n        int low = 0, mid = 0, high = nums.length - 1;\n        while (mid <= high) {\n            if (nums[mid] == 0) {\n                int t = nums[low]; nums[low] = nums[mid]; nums[mid] = t;\n                low++; mid++;\n            } else if (nums[mid] == 1) {\n                mid++;\n            } else {\n                int t = nums[mid]; nums[mid] = nums[high]; nums[high] = t;\n                high--; mid++;\n            }\n        }\n        return nums;\n    }\n}",
            "javascript": "function sortColors(nums) {\n    let low = 0, mid = 0, high = nums.length - 1;\n    while (mid <= high) {\n        if (nums[mid] === 0) {\n            [nums[low], nums[mid]] = [nums[mid], nums[low]];\n            low++; mid++;\n        } else if (nums[mid] === 1) {\n            mid++;\n        } else {\n            [nums[mid], nums[high]] = [nums[high], nums[mid]];\n            high--; mid++;\n        }\n    }\n    return nums;\n}"
        },
        "sample_input": "[2, 0, 2, 1, 1, 0]",
        "expected_output": "[0, 0, 1, 1, 2, 2]",
        "examples": [
            {"input": "nums = [2, 0, 2, 1, 1, 0]", "output": "[0, 0, 1, 1, 2, 2]", "explanation": "Sorted in-place in 0s, 1s, 2s order."}
        ],
        "test_cases_json": [
            {"input": "[2, 0, 2, 1, 1, 0]", "expected_output": "[0, 0, 1, 1, 2, 2]"},
            {"input": "[2, 0, 1]", "expected_output": "[0, 1, 2]"},
            {"input": "[0]", "expected_output": "[0]"}
        ],
        "line_budget": 1,
        "xp_reward": 250,
    },

    # ── 9. Aug 13, 2026 ───────────────────────────────────────────────────────
    {
        "date": date(2026, 8, 13),
        "title": "2D Matrix Search Direction Inversion",
        "category": "matrix",
        "description": "Search in a row and column sorted matrix starting from top-right corner. Inverting the column step direction triggers index out-of-bounds error. Fix in 1 line.",
        "starter_codes": {
            "python": "def search_matrix(matrix, target):\n    if not matrix: return False\n    r, c = 0, len(matrix[0]) - 1\n    while r < len(matrix) and c >= 0:\n        if matrix[r][c] == target:\n            return True\n        elif matrix[r][c] > target:\n            c += 1\n        else:\n            r += 1\n    return False",
            "cpp": "#include <vector>\nusing namespace std;\n\nbool searchMatrix(vector<vector<int>>& matrix, int target) {\n    if (matrix.empty()) return false;\n    int r = 0, c = matrix[0].size() - 1;\n    while (r < matrix.size() && c >= 0) {\n        if (matrix[r][c] == target) return true;\n        else if (matrix[r][c] > target) c++;\n        else r++;\n    }\n    return false;\n}",
            "java": "public class Solution {\n    public static boolean searchMatrix(int[][] matrix, int target) {\n        if (matrix.length == 0) return false;\n        int r = 0, c = matrix[0].length - 1;\n        while (r < matrix.length && c >= 0) {\n            if (matrix[r][c] == target) return true;\n            else if (matrix[r][c] > target) c++;\n            else r++;\n        }\n        return false;\n    }\n}",
            "javascript": "function searchMatrix(matrix, target) {\n    if (!matrix.length) return false;\n    let r = 0, c = matrix[0].length - 1;\n    while (r < matrix.length && c >= 0) {\n        if (matrix[r][c] === target) return true;\n        else if (matrix[r][c] > target) c++;\n        else r++;\n    }\n    return false;\n}"
        },
        "sample_input": "[[1,4,7,11],[2,5,8,12],[3,6,9,16],[10,13,14,17]]\n5",
        "expected_output": "true",
        "examples": [
            {"input": "matrix = [[1,4,7,11],[2,5,8,12]], target = 5", "output": "true", "explanation": "Target 5 is present at matrix[1][1]."}
        ],
        "test_cases_json": [
            {"input": "[[1,4,7,11],[2,5,8,12],[3,6,9,16],[10,13,14,17]]\n5", "expected_output": "true"},
            {"input": "[[1,4,7,11],[2,5,8,12],[3,6,9,16],[10,13,14,17]]\n20", "expected_output": "false"}
        ],
        "line_budget": 1,
        "xp_reward": 150,
    },

    # ── 10. Aug 14, 2026 ──────────────────────────────────────────────────────
    {
        "date": date(2026, 8, 14),
        "title": "String GCD Slicing Off-By-One",
        "category": "strings",
        "description": "Find the largest string X that divides both str1 and str2. Slice upper bound takes 1 extra character beyond GCD length. Fix in 1 line.",
        "starter_codes": {
            "python": "from math import gcd\n\ndef gcd_of_strings(str1, str2):\n    if str1 + str2 != str2 + str1:\n        return ''\n    max_len = gcd(len(str1), len(str2))\n    return str1[:max_len + 1]",
            "cpp": "#include <string>\n#include <numeric>\nusing namespace std;\n\nstring gcdOfStrings(string str1, string str2) {\n    if (str1 + str2 != str2 + str1) return \"\";\n    int maxLen = std::gcd(str1.length(), str2.length());\n    return str1.substr(0, maxLen + 1);\n}",
            "java": "public class Solution {\n    private static int gcd(int a, int b) { return b == 0 ? a : gcd(b, a % b); }\n    public static String gcdOfStrings(String str1, String str2) {\n        if (!(str1 + str2).equals(str2 + str1)) return \"\";\n        int maxLen = gcd(str1.length(), str2.length());\n        return str1.substring(0, maxLen + 1);\n    }\n}",
            "javascript": "function gcdOfStrings(str1, str2) {\n    function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }\n    if (str1 + str2 !== str2 + str1) return '';\n    let maxLen = gcd(str1.length, str2.length);\n    return str1.slice(0, maxLen + 1);\n}"
        },
        "sample_input": "ABCABC\nABC",
        "expected_output": "ABC",
        "examples": [
            {"input": "str1 = \"ABCABC\", str2 = \"ABC\"", "output": "ABC", "explanation": "GCD string is \"ABC\"."}
        ],
        "test_cases_json": [
            {"input": "ABCABC\nABC", "expected_output": "ABC"},
            {"input": "ABABAB\nABAB", "expected_output": "AB"},
            {"input": "LEET\nCODE", "expected_output": ""}
        ],
        "line_budget": 1,
        "xp_reward": 100,
    },
]

def seed():
    count = 0
    for data in BUGS_DATA:
        existing = DailyBug.objects.filter(date=data["date"]).first()
        if existing:
            existing.title = data["title"]
            existing.category = data["category"]
            existing.description = data["description"]
            existing.starter_codes = data["starter_codes"]
            existing.test_cases_json = data["test_cases_json"]
            existing.examples = data["examples"]
            existing.sample_input = data["sample_input"]
            existing.expected_output = data["expected_output"]
            existing.line_budget = data.get("line_budget", 1)
            existing.xp_reward = data.get("xp_reward", 100)
            existing.time_limit_ms = data.get("time_limit_ms", 2000)
            existing.is_active = True
            existing.save()
            print(f"[Updated] {data['date']}: {data['title']}")
        else:
            DailyBug.objects.create(
                id=uuid.uuid4(),
                date=data["date"],
                title=data["title"],
                category=data["category"],
                description=data["description"],
                starter_codes=data["starter_codes"],
                test_cases_json=data["test_cases_json"],
                examples=data["examples"],
                sample_input=data["sample_input"],
                expected_output=data["expected_output"],
                line_budget=data.get("line_budget", 1),
                xp_reward=data.get("xp_reward", 100),
                time_limit_ms=data.get("time_limit_ms", 2000),
                is_active=True,
            )
            print(f"[Created] {data['date']}: {data['title']}")
        count += 1
    print(f"\nSuccessfully seeded {count} DailyBugs in PostgreSQL/SQLite database!")

if __name__ == "__main__":
    seed()

