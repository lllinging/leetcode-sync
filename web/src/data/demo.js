// Sample problems shown on first load so users can explore all features
export const DEMO_PROBLEMS = [
  {
    id: "demo-1",
    title: "3. Longest Substring Without Repeating Characters",
    category: "Sliding Window / Two Pointers",
    subCategory: "1.1 Sliding Window",
    difficulty: "Medium",
    complexity: "O(n) / O(min(n,m))",
    tags: ["Hash Table", "Sliding Window"],
    keyPoints:
      "Track character positions in a hash map; on duplicate, jump left pointer forward.",
    approach:
      "Maintain a window [left, right]. Use a map to record each character's latest index. When the right pointer hits a duplicate, move left to max(left, map[c]+1).",
    pitfalls:
      "Left pointer must jump to max(left, map[c]+1), not just left+1 — otherwise it can move backwards.",
    highlights: "Classic sliding window template problem.",
    interviewIntro:
      "This is a classic sliding window problem where we maintain a window of unique characters.",
    solutions: [
      {
        label: "HashMap",
        lang: "python",
        code: "def lengthOfLongestSubstring(s):\n    mp = {}\n    l = res = 0\n    for r, c in enumerate(s):\n        if c in mp and mp[c] >= l:\n            l = mp[c] + 1\n        mp[c] = r\n        res = max(res, r - l + 1)\n    return res",
      },
      {
        label: "Set",
        lang: "python",
        code: "def lengthOfLongestSubstring(s):\n    seen = set()\n    l = res = 0\n    for r in range(len(s)):\n        while s[r] in seen:\n            seen.remove(s[l]); l += 1\n        seen.add(s[r])\n        res = max(res, r - l + 1)\n    return res",
      },
    ],
    reviewHistory: [{ date: "2026-03-18", quality: 3 }],
    nextReview: "2026-03-22",
    reviewStage: 1,
    dateAdded: "2026-03-18",
    aiGenerated: false,
  },
  {
    id: "demo-2",
    title: "704. Binary Search",
    category: "Binary Search",
    subCategory: "2.1 Standard Binary Search",
    difficulty: "Easy",
    complexity: "O(log n) / O(1)",
    tags: ["Binary Search"],
    keyPoints:
      "Boundary matters: closed interval uses while l<=r; half-open uses while l<r.",
    approach:
      "Classic binary search template — compare mid with target each iteration to halve the search space.",
    pitfalls:
      "The while condition and how r is updated must match the interval definition.",
    highlights: "Fundamental binary search template, must-know for interviews.",
    interviewIntro:
      "Standard binary search with two common interval conventions.",
    solutions: [
      {
        label: "Closed interval",
        lang: "python",
        code: "def search(nums, target):\n    l, r = 0, len(nums)-1\n    while l <= r:\n        m = (l+r)//2\n        if nums[m] == target: return m\n        elif nums[m] < target: l = m+1\n        else: r = m-1\n    return -1",
      },
      {
        label: "Half-open interval",
        lang: "python",
        code: "def search(nums, target):\n    l, r = 0, len(nums)\n    while l < r:\n        m = (l+r)//2\n        if nums[m] == target: return m\n        elif nums[m] < target: l = m+1\n        else: r = m\n    return -1",
      },
    ],
    reviewHistory: [
      { date: "2026-03-10", quality: 5 },
      { date: "2026-03-12", quality: 4 },
    ],
    nextReview: "2026-03-26",
    reviewStage: 3,
    dateAdded: "2026-03-10",
    aiGenerated: false,
  },
];
