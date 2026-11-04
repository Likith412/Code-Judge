// The starter problems. All stdin to stdout, with hidden cases at the stated limits.
const { createRandom, LOWER, ALNUM } = require("./random");

// Every problem opens with the same skeleton plus one line of its own.
const starter = (hint) => ({
   java: [
      "import java.util.*;",
      "",
      "public class Main {",
      "   public static void main(String[] args) {",
      "      Scanner sc = new Scanner(System.in);",
      `      // ${hint}`,
      "   }",
      "}",
   ].join("\n"),
   python: ["def main():", `    # ${hint}`, "    pass", "", "", "main()"].join(
      "\n",
   ),
   cpp: [
      "#include <bits/stdc++.h>",
      "using namespace std;",
      "",
      "int main() {",
      `   // ${hint}`,
      "   return 0;",
      "}",
   ].join("\n"),
});

// Every starter problem reads stdin, so all three languages fit.
const ALL_LANGUAGES = ["java", "python", "cpp"];

/* ---- reading and checking inputs -------------------------------------- */

const linesOf = (input) => input.split("\n");

const numbersOf = (line = "") =>
   line.trim() === "" ? [] : line.trim().split(/\s+/).map(Number);

const isInt = (value, lo, hi) =>
   Number.isInteger(value) && value >= lo && value <= hi;

function assert(ok, message) {
   if (!ok) throw new Error(message);
}

function assertLines(lines, count) {
   assert(lines.length === count, `expected ${count} lines`);
}

// Samples first, then hidden cases. solve() writes every expected output.
function withCases(spec) {
   const { solve, check, samples, hidden, ...problem } = spec;

   const verify = (input) => {
      try {
         check(input);
      } catch (err) {
         throw new Error(`${spec.title}: input breaks the constraints, ${err.message}`);
      }
   };

   for (const example of problem.examples) {
      verify(example.input);
      assert(
         solve(example.input) === example.output,
         `${spec.title}: example output does not match the solution`,
      );
   }

   const cases = [
      ...samples.map((sample) => ({ ...sample, isHidden: false })),
      ...hidden.map((input) => ({ input, isHidden: true })),
   ];

   return {
      ...problem,
      testCases: cases.map((testCase) => {
         verify(testCase.input);

         return { ...testCase, expectedOutput: solve(testCase.input) };
      }),
   };
}

/* ---- big case builders ------------------------------------------------ */

// Others are multiples of 3 and the pair shares a non-zero remainder, so only it works.
function twoSumCase(random, n, i, j, x, y) {
   const numbers = Array.from(
      { length: n },
      () => 3 * random.int(-333333333, 333333333),
   );

   numbers[i] = x;
   numbers[j] = y;

   return `${n}\n${numbers.join(" ")}\n${x + y}`;
}

// Strictly increasing, from about -10^9 upward, gaps of 1 to 19000.
function increasing(random, n) {
   const numbers = [];
   let value = -1_000_000_000 + random.int(0, 1000);

   for (let index = 0; index < n; index += 1) {
      numbers.push(value);
      value += random.int(1, 19000);
   }

   return numbers;
}

const sorted = (numbers) => [...numbers].sort((a, b) => a - b);

const PAIRS = { "(": ")", "[": "]", "{": "}" };

// A balanced line of mixed brackets, nesting at random.
function balanced(random, length) {
   const stack = [];
   let out = "";

   while (out.length < length) {
      const left = length - out.length;

      if (stack.length && (stack.length === left || random.next() < 0.5)) {
         out += PAIRS[stack.pop()];
      } else {
         const open = random.pick(Object.keys(PAIRS));
         stack.push(open);
         out += open;
      }
   }

   return out;
}

// One long path that winds down the grid, so a recursive walk goes 45,000 deep.
function serpentine(rows, cols) {
   return Array.from({ length: rows }, (_, row) => {
      if (row % 2 === 0) return "1".repeat(cols);

      const one = (row - 1) % 4 === 0 ? cols - 1 : 0;

      return Array.from({ length: cols }, (__, col) =>
         col === one ? "1" : "0",
      ).join("");
   });
}

const grid = (rows) => `${rows.length} ${rows[0].length}\n${rows.join("\n")}`;

/* ---- the problems ----------------------------------------------------- */

const twoSumRandom = createRandom(1);
const reverseRandom = createRandom(2);
const searchRandom = createRandom(4);
const bracketRandom = createRandom(6);
const subarrayRandom = createRandom(7);
const prefixRandom = createRandom(8);
const mergeRandom = createRandom(9);
const islandRandom = createRandom(10);
const lisRandom = createRandom(11);
const editRandom = createRandom(12);

const problems = [
   {
      title: "Two Sum",
      difficulty: "EASY",
      tags: ["array", "hash-table"],
      supportedLanguages: ALL_LANGUAGES,
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      description: [
         "Given `n` integers and a target, find the two positions whose numbers add up to the target.",
         "",
         "**Input**",
         "",
         "Line 1: `n`. Line 2: `n` integers. Line 3: `target`.",
         "",
         "**Output**",
         "",
         "The two positions `i` and `j`, counting from 0, with `i < j`, separated by a space.",
         "",
         "Checking every pair is too slow for the largest `n`. The sum can pass the 32 bit range.",
      ].join("\n"),
      constraints: [
         "2 <= n <= 2 * 10^5",
         "-10^9 <= nums[i] <= 10^9",
         "-2 * 10^9 <= target <= 2 * 10^9",
         "Exactly one pair i < j has nums[i] + nums[j] = target",
      ],
      examples: [
         {
            input: "4\n2 7 11 15\n9",
            output: "0 1",
            explanation: "2 + 7 is 9, so the answer is positions 0 and 1.",
         },
      ],
      starterCode: starter(
         "read n, the numbers and the target, then print the two positions",
      ),
      samples: [
         {
            input: "4\n2 7 11 15\n9",
            explanation: "2 + 7 = 9",
         },
         { input: "3\n3 2 4\n6", explanation: "2 + 4 = 6" },
      ],
      hidden: [
         "2\n3 3\n6",
         "5\n-1 -2 -3 -4 -5\n-8",
         "6\n1000000000 2 3 4 5 -1000000000\n0",
         twoSumCase(twoSumRandom, 200000, 199998, 199999, 1, 7),
         twoSumCase(twoSumRandom, 200000, 0, 199999, 1e9, 1e9),
         twoSumCase(twoSumRandom, 200000, 31337, 177777, -1e9, -999999997),
      ],
      check(input) {
         const lines = linesOf(input);
         assertLines(lines, 3);

         const n = Number(lines[0]);
         const numbers = numbersOf(lines[1]);
         const target = Number(lines[2]);

         assert(isInt(n, 2, 2e5) && numbers.length === n, "n");
         assert(numbers.every((x) => isInt(x, -1e9, 1e9)), "nums[i]");
         assert(isInt(target, -2e9, 2e9), "target");

         let pairs = 0;
         const seen = new Map();

         for (const x of numbers) {
            pairs += seen.get(target - x) || 0;
            seen.set(x, (seen.get(x) || 0) + 1);
         }

         assert(pairs === 1, "exactly one pair");
      },
      solve(input) {
         const lines = linesOf(input);
         const numbers = numbersOf(lines[1]);
         const target = Number(lines[2]);
         const seen = new Map();

         for (let j = 0; j < numbers.length; j += 1) {
            if (seen.has(target - numbers[j])) {
               return `${seen.get(target - numbers[j])} ${j}`;
            }

            seen.set(numbers[j], j);
         }

         throw new Error("Two Sum: no pair");
      },
   },
   {
      title: "Reverse a String",
      difficulty: "EASY",
      tags: ["string", "two-pointers"],
      supportedLanguages: ALL_LANGUAGES,
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      description: [
         "Print the given word backwards.",
         "",
         "**Input**",
         "",
         "One line holding the word `s`, with no spaces.",
         "",
         "**Output**",
         "",
         "The same characters in the opposite order.",
         "",
         "Building the answer one character at a time with string `+` is too slow for the longest words.",
      ].join("\n"),
      constraints: [
         "1 <= s.length <= 10^6",
         "s holds English letters (a-z, A-Z) and digits (0-9) only",
      ],
      examples: [{ input: "hello", output: "olleh" }],
      starterCode: starter("read the word and print it backwards"),
      samples: [
         { input: "hello", explanation: "The letters run the other way." },
         { input: "a", explanation: "One character reads the same both ways." },
      ],
      hidden: [
         "racecar",
         "abcdef123",
         reverseRandom.word(1000000, ALNUM),
         "Ab9".repeat(333333),
      ],
      check(input) {
         const lines = linesOf(input);
         assertLines(lines, 1);
         assert(/^[A-Za-z0-9]{1,1000000}$/.test(lines[0]), "s");
      },
      solve: (input) => [...input].reverse().join(""),
   },
   {
      title: "Fizz Buzz",
      difficulty: "EASY",
      tags: ["math", "simulation"],
      supportedLanguages: ALL_LANGUAGES,
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      description: [
         "Count from 1 to `n`, one number per line, with two rules.",
         "",
         "Print `Fizz` when the number divides by 3, `Buzz` when it divides by 5, and `FizzBuzz` when it divides by both. Otherwise print the number.",
         "",
         "**Input**",
         "",
         "One line holding `n`.",
         "",
         "**Output**",
         "",
         "`n` lines.",
      ].join("\n"),
      constraints: ["1 <= n <= 10^5"],
      examples: [{ input: "5", output: "1\n2\nFizz\n4\nBuzz" }],
      starterCode: starter("loop from 1 to n and print one line each time"),
      samples: [
         { input: "5", explanation: "3 divides by 3, 5 divides by 5." },
         { input: "15", explanation: "15 divides by both." },
      ],
      hidden: ["1", "3", "99999", "100000"],
      check(input) {
         const lines = linesOf(input);
         assertLines(lines, 1);
         assert(isInt(Number(lines[0]), 1, 1e5), "n");
      },
      solve(input) {
         const n = Number(input);
         const out = [];

         for (let i = 1; i <= n; i += 1) {
            if (i % 15 === 0) out.push("FizzBuzz");
            else if (i % 3 === 0) out.push("Fizz");
            else if (i % 5 === 0) out.push("Buzz");
            else out.push(String(i));
         }

         return out.join("\n");
      },
   },
   {
      title: "Binary Search",
      difficulty: "EASY",
      tags: ["array", "binary-search"],
      supportedLanguages: ALL_LANGUAGES,
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      description: [
         "Answer `q` lookups in one sorted list. For each target, print its position counting from 0, or `-1` when it is not in the list.",
         "",
         "**Input**",
         "",
         "Line 1: `n`. Line 2: `n` integers, strictly increasing. Line 3: `q`. Line 4: `q` targets.",
         "",
         "**Output**",
         "",
         "`q` lines, one answer per target, in the order they were asked.",
         "",
         "Scanning the whole list for every target is too slow for the largest `n` and `q`.",
      ].join("\n"),
      constraints: [
         "1 <= n <= 10^5",
         "1 <= q <= 10^5",
         "-10^9 <= nums[i], target <= 10^9",
         "nums is strictly increasing, so it holds no repeats",
      ],
      examples: [
         {
            input: "6\n-1 0 3 5 9 12\n2\n9 2",
            output: "4\n-1",
            explanation: "9 sits at position 4. 2 is not in the list.",
         },
      ],
      starterCode: starter("halve the range until each target is found"),
      samples: [
         {
            input: "6\n-1 0 3 5 9 12\n2\n9 2",
            explanation: "9 sits at position 4. 2 is not in the list.",
         },
         {
            input: "1\n5\n3\n5 -5 6",
            explanation: "Only 5 is there, at position 0.",
         },
      ],
      hidden: [
         "5\n1 2 3 4 5\n5\n1 5 3 0 6",
         "2\n-1000000000 1000000000\n4\n-1000000000 1000000000 0 999999999",
         (() => {
            const numbers = increasing(searchRandom, 100000);
            const targets = Array.from({ length: 100000 }, (_, index) =>
               index % 2
                  ? searchRandom.pick(numbers)
                  : searchRandom.pick(numbers) + 1,
            );

            return `100000\n${numbers.join(" ")}\n100000\n${targets.join(" ")}`;
         })(),
         (() => {
            const numbers = Array.from({ length: 100000 }, (_, i) => i - 50000);
            const targets = Array.from({ length: 100000 }, (_, i) => 49999 - i);

            return `100000\n${numbers.join(" ")}\n100000\n${targets.join(" ")}`;
         })(),
      ],
      check(input) {
         const lines = linesOf(input);
         assertLines(lines, 4);

         const n = Number(lines[0]);
         const numbers = numbersOf(lines[1]);
         const q = Number(lines[2]);
         const targets = numbersOf(lines[3]);

         assert(isInt(n, 1, 1e5) && numbers.length === n, "n");
         assert(isInt(q, 1, 1e5) && targets.length === q, "q");
         assert(
            [...numbers, ...targets].every((x) => isInt(x, -1e9, 1e9)),
            "nums[i] and target",
         );
         assert(
            numbers.every((x, i) => i === 0 || numbers[i - 1] < x),
            "strictly increasing",
         );
      },
      solve(input) {
         const lines = linesOf(input);
         const position = new Map(numbersOf(lines[1]).map((x, i) => [x, i]));

         return numbersOf(lines[3])
            .map((target) => position.get(target) ?? -1)
            .join("\n");
      },
   },
   {
      title: "Climbing Stairs",
      difficulty: "EASY",
      tags: ["dynamic-programming", "math"],
      supportedLanguages: ALL_LANGUAGES,
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      description: [
         "You climb a staircase of `n` steps, one or two steps at a time. Count how many different ways reach the top.",
         "",
         "**Input**",
         "",
         "One line holding `n`.",
         "",
         "**Output**",
         "",
         "The number of ways. It passes the 32 bit range from `n = 46`, and fits a signed 64 bit integer for every allowed `n`.",
      ].join("\n"),
      constraints: ["1 <= n <= 80"],
      examples: [
         { input: "3", output: "3", explanation: "1+1+1, 1+2 and 2+1." },
      ],
      starterCode: starter("each step is the sum of the two before it"),
      samples: [
         { input: "3", explanation: "1+1+1, 1+2, 2+1" },
         { input: "1", explanation: "One step, one way." },
      ],
      hidden: ["2", "10", "45", "46", "79", "80"],
      check(input) {
         const lines = linesOf(input);
         assertLines(lines, 1);
         assert(isInt(Number(lines[0]), 1, 80), "n");
      },
      solve(input) {
         let [a, b] = [1n, 1n];

         for (let i = 1; i < Number(input); i += 1) [a, b] = [b, a + b];

         return String(b);
      },
   },
   {
      title: "Valid Parentheses",
      difficulty: "MEDIUM",
      tags: ["stack", "string"],
      supportedLanguages: ALL_LANGUAGES,
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      description: [
         "A line holds only the characters `(`, `)`, `[`, `]`, `{` and `}`. Decide whether every bracket closes in the right order.",
         "",
         "**Input**",
         "",
         "One line holding the brackets `s`.",
         "",
         "**Output**",
         "",
         "`true` or `false`, in lowercase.",
         "",
         "Removing matched pairs over and over is too slow for the longest lines.",
      ].join("\n"),
      constraints: [
         "1 <= s.length <= 10^5",
         "s holds only the characters ( ) [ ] { }",
      ],
      examples: [
         { input: "()[]{}", output: "true" },
         {
            input: "(]",
            output: "false",
            explanation: "A round bracket cannot close a square one.",
         },
      ],
      starterCode: starter(
         "push an opening bracket, pop when the matching one closes",
      ),
      samples: [
         {
            input: "()[]{}",
            explanation: "Three pairs, each closed straight away.",
         },
         { input: "(]", explanation: "The wrong kind of bracket closes it." },
      ],
      hidden: [
         "([{}])",
         "(((",
         ")(",
         "([)]",
         `${"([{".repeat(16666)}(())${"}])".repeat(16666)}`,
         balanced(bracketRandom, 100000),
         `${balanced(bracketRandom, 99998)}(]`,
         "(".repeat(100000),
      ],
      check(input) {
         const lines = linesOf(input);
         assertLines(lines, 1);
         assert(/^[()[\]{}]{1,100000}$/.test(lines[0]), "s");
      },
      solve(input) {
         const closes = { ")": "(", "]": "[", "}": "{" };
         const stack = [];

         for (const char of input) {
            if (PAIRS[char]) stack.push(char);
            else if (stack.pop() !== closes[char]) return "false";
         }

         return stack.length === 0 ? "true" : "false";
      },
   },
   {
      title: "Maximum Subarray",
      difficulty: "MEDIUM",
      tags: ["array", "dynamic-programming"],
      supportedLanguages: ALL_LANGUAGES,
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      description: [
         "Find the run of neighbouring numbers with the largest total. At least one number must be taken.",
         "",
         "**Input**",
         "",
         "Line 1: `n`. Line 2: `n` integers.",
         "",
         "**Output**",
         "",
         "The largest total.",
         "",
         "Trying every start and end is too slow for the largest `n`.",
      ].join("\n"),
      constraints: ["1 <= n <= 10^5", "-10^4 <= nums[i] <= 10^4"],
      examples: [
         {
            input: "9\n-2 1 -3 4 -1 2 1 -5 4",
            output: "6",
            explanation: "The run 4 -1 2 1 adds up to 6.",
         },
      ],
      starterCode: starter(
         "keep the best total ending here and the best seen so far",
      ),
      samples: [
         {
            input: "9\n-2 1 -3 4 -1 2 1 -5 4",
            explanation: "4 + -1 + 2 + 1 = 6",
         },
         { input: "1\n1", explanation: "One number is the whole answer." },
      ],
      hidden: [
         "5\n-5 -4 -3 -2 -1",
         "5\n5 4 -1 7 8",
         "3\n-1 0 -2",
         `100000\n${subarrayRandom.ints(100000, -10000, 10000).join(" ")}`,
         `100000\n${subarrayRandom.ints(100000, -10000, -1).join(" ")}`,
         `100000\n${Array(100000).fill(10000).join(" ")}`,
         `100000\n${subarrayRandom.ints(100000, -10000, 9000).join(" ")}`,
      ],
      check(input) {
         const lines = linesOf(input);
         assertLines(lines, 2);

         const n = Number(lines[0]);
         const numbers = numbersOf(lines[1]);

         assert(isInt(n, 1, 1e5) && numbers.length === n, "n");
         assert(numbers.every((x) => isInt(x, -1e4, 1e4)), "nums[i]");
      },
      solve(input) {
         const numbers = numbersOf(linesOf(input)[1]);
         let best = numbers[0];
         let here = 0;

         for (const x of numbers) {
            here = Math.max(x, here + x);
            best = Math.max(best, here);
         }

         return String(best);
      },
   },
   {
      title: "Longest Common Prefix",
      difficulty: "MEDIUM",
      tags: ["string", "trie"],
      supportedLanguages: ALL_LANGUAGES,
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      description: [
         "Find the longest opening that all the given words share.",
         "",
         "**Input**",
         "",
         "Line 1: `n`. The next `n` lines hold one word each.",
         "",
         "**Output**",
         "",
         "The shared opening, or `-1` when the words share nothing.",
      ].join("\n"),
      constraints: [
         "1 <= n <= 200",
         "1 <= length of each word <= 200",
         "Words hold lowercase English letters (a-z) only",
      ],
      examples: [
         { input: "3\nflower\nflow\nflight", output: "fl" },
         {
            input: "3\ndog\nracecar\ncar",
            output: "-1",
            explanation: "They share nothing, so print -1.",
         },
      ],
      starterCode: starter(
         "compare the first word against the rest, character by character",
      ),
      samples: [
         {
            input: "3\nflower\nflow\nflight",
            explanation: "All three start with fl.",
         },
         { input: "1\nalone", explanation: "One word shares all of itself." },
      ],
      hidden: [
         "3\ndog\nracecar\ncar",
         "2\nsame\nsame",
         "3\nabab\nab\nabc",
         `200\n${Array(200).fill("z".repeat(200)).join("\n")}`,
         (() => {
            const shared = prefixRandom.word(199, LOWER);
            const words = Array.from(
               { length: 200 },
               (_, i) => shared + LOWER[i % 26],
            );

            return `200\n${words.join("\n")}`;
         })(),
         (() => {
            const shared = prefixRandom.word(100, LOWER);
            const words = Array.from(
               { length: 200 },
               (_, i) =>
                  shared +
                  LOWER[i % 2] +
                  prefixRandom.word(prefixRandom.int(0, 99), LOWER),
            );

            return `200\n${words.join("\n")}`;
         })(),
      ],
      check(input) {
         const lines = linesOf(input);
         const n = Number(lines[0]);

         assert(isInt(n, 1, 200), "n");
         assertLines(lines, n + 1);
         assert(
            lines.slice(1).every((word) => /^[a-z]{1,200}$/.test(word)),
            "word",
         );
      },
      solve(input) {
         const [first, ...rest] = linesOf(input).slice(1);
         let length = first.length;

         for (const word of rest) {
            let same = 0;

            while (same < length && word[same] === first[same]) same += 1;

            length = same;
         }

         return length ? first.slice(0, length) : "-1";
      },
   },
   {
      title: "Merge Two Sorted Arrays",
      difficulty: "MEDIUM",
      tags: ["array", "two-pointers", "sorting"],
      supportedLanguages: ALL_LANGUAGES,
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      description: [
         "Put two sorted lists together into one sorted list.",
         "",
         "**Input**",
         "",
         "Line 1: `n` and `m`. Line 2: `n` integers, smallest first. Line 3: `m` integers, smallest first. A line is empty when its length is 0.",
         "",
         "**Output**",
         "",
         "All `n + m` numbers on one line, smallest first, separated by single spaces.",
         "",
         "Inserting one number at a time into a list is too slow for the largest inputs.",
      ].join("\n"),
      constraints: [
         "0 <= n, m <= 10^5",
         "1 <= n + m",
         "-10^9 <= each number <= 10^9",
         "Each list is sorted, smallest first. Repeats are allowed",
      ],
      examples: [{ input: "3 3\n1 2 3\n2 5 6", output: "1 2 2 3 5 6" }],
      starterCode: starter("walk both lists at once and take the smaller head"),
      samples: [
         {
            input: "3 3\n1 2 3\n2 5 6",
            explanation: "The two 2s both stay.",
         },
         { input: "1 0\n1\n", explanation: "The second list is empty." },
      ],
      hidden: [
         "0 1\n\n7",
         "2 3\n-5 -1\n-4 -3 0",
         "3 3\n1 1 1\n1 1 1",
         `100000 100000\n${sorted(mergeRandom.ints(100000, -1e9, 1e9)).join(" ")}\n${sorted(mergeRandom.ints(100000, -1e9, 1e9)).join(" ")}`,
         `100000 0\n${sorted(mergeRandom.ints(100000, -1e9, 1e9)).join(" ")}\n`,
         `100000 100000\n${Array.from({ length: 100000 }, (_, i) => 2 * i).join(" ")}\n${Array.from({ length: 100000 }, (_, i) => 2 * i + 1).join(" ")}`,
      ],
      check(input) {
         const lines = linesOf(input);
         assertLines(lines, 3);

         const [n, m] = numbersOf(lines[0]);
         const a = numbersOf(lines[1]);
         const b = numbersOf(lines[2]);

         assert(isInt(n, 0, 1e5) && isInt(m, 0, 1e5) && n + m >= 1, "n, m");
         assert(a.length === n && b.length === m, "list lengths");

         for (const list of [a, b]) {
            assert(list.every((x) => isInt(x, -1e9, 1e9)), "each number");
            assert(
               list.every((x, i) => i === 0 || list[i - 1] <= x),
               "sorted",
            );
         }
      },
      solve(input) {
         const lines = linesOf(input);
         const a = numbersOf(lines[1]);
         const b = numbersOf(lines[2]);
         const out = [];
         let i = 0;
         let j = 0;

         while (i < a.length || j < b.length) {
            if (j === b.length || (i < a.length && a[i] <= b[j]))
               out.push(a[i++]);
            else out.push(b[j++]);
         }

         return out.join(" ");
      },
   },
   {
      title: "Number of Islands",
      difficulty: "HARD",
      tags: ["graph", "dfs", "matrix"],
      supportedLanguages: ALL_LANGUAGES,
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      description: [
         "A grid holds `1` for land and `0` for water. Count the islands. Land touching left, right, up or down belongs to the same island. Diagonals do not count.",
         "",
         "**Input**",
         "",
         "Line 1: `rows` and `cols`. The next `rows` lines hold `cols` characters each, with no spaces.",
         "",
         "**Output**",
         "",
         "The number of islands.",
         "",
         "One island can wind through the whole grid, so a recursive walk may go very deep.",
      ].join("\n"),
      constraints: [
         "1 <= rows, cols <= 300",
         "Each row holds exactly cols characters, each 0 or 1",
      ],
      examples: [
         {
            input: "4 5\n11110\n11010\n11000\n00000",
            output: "1",
            explanation: "All the land is joined, so it is one island.",
         },
      ],
      starterCode: starter(
         "walk out from each unvisited piece of land and sink it",
      ),
      samples: [
         {
            input: "4 5\n11110\n11010\n11000\n00000",
            explanation: "Every 1 is reachable from every other.",
         },
         {
            input: "4 5\n11000\n11000\n00100\n00011",
            explanation: "Three separate patches.",
         },
      ],
      hidden: [
         "1 1\n0",
         "1 1\n1",
         "3 3\n101\n010\n101",
         grid(Array(300).fill("1".repeat(300))),
         grid(
            Array.from({ length: 300 }, (_, row) =>
               (row % 2 ? "01" : "10").repeat(150),
            ),
         ),
         grid(serpentine(300, 300)),
         grid(
            Array.from({ length: 300 }, () =>
               Array.from({ length: 300 }, () =>
                  islandRandom.next() < 0.45 ? "1" : "0",
               ).join(""),
            ),
         ),
         grid(Array.from({ length: 300 }, (_, row) => String((row + 1) % 2))),
      ],
      check(input) {
         const lines = linesOf(input);
         const [rows, cols] = numbersOf(lines[0]);

         assert(isInt(rows, 1, 300) && isInt(cols, 1, 300), "rows, cols");
         assertLines(lines, rows + 1);

         const row = new RegExp(`^[01]{${cols}}$`);
         assert(
            lines.slice(1).every((line) => row.test(line)),
            "row characters",
         );
      },
      solve(input) {
         const [size, ...rows] = linesOf(input);
         const [height, width] = numbersOf(size);
         const land = rows.map((row) => [...row].map((char) => char === "1"));
         let islands = 0;

         // An explicit stack, since recursion this deep would overflow here too.
         for (let r = 0; r < height; r += 1) {
            for (let c = 0; c < width; c += 1) {
               if (!land[r][c]) continue;

               islands += 1;
               land[r][c] = false;
               const stack = [[r, c]];

               while (stack.length) {
                  const [y, x] = stack.pop();

                  for (const [dy, dx] of [
                     [1, 0],
                     [-1, 0],
                     [0, 1],
                     [0, -1],
                  ]) {
                     const [ny, nx] = [y + dy, x + dx];

                     if (land[ny]?.[nx]) {
                        land[ny][nx] = false;
                        stack.push([ny, nx]);
                     }
                  }
               }
            }
         }

         return String(islands);
      },
   },
   {
      title: "Longest Increasing Subsequence",
      difficulty: "HARD",
      tags: ["dynamic-programming", "binary-search"],
      supportedLanguages: ALL_LANGUAGES,
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      description: [
         "Pick numbers from the list, keeping their order, so that each one is strictly bigger than the one before. Report how many you can pick.",
         "",
         "The picked numbers need not sit next to each other.",
         "",
         "**Input**",
         "",
         "Line 1: `n`. Line 2: `n` integers.",
         "",
         "**Output**",
         "",
         "The longest length.",
         "",
         "Comparing every pair of positions is too slow for the largest `n`.",
      ].join("\n"),
      constraints: ["1 <= n <= 10^5", "-10^9 <= nums[i] <= 10^9"],
      examples: [
         {
            input: "8\n10 9 2 5 3 7 101 18",
            output: "4",
            explanation: "2 3 7 101 is four numbers long.",
         },
      ],
      starterCode: starter(
         "keep the smallest tail for each length and search it",
      ),
      samples: [
         { input: "8\n10 9 2 5 3 7 101 18", explanation: "2 3 7 101" },
         {
            input: "1\n7",
            explanation: "One number is already a run of one.",
         },
      ],
      hidden: [
         "5\n5 4 3 2 1",
         "7\n7 7 7 7 7 7 7",
         "6\n1 3 6 7 9 4",
         `100000\n${lisRandom.ints(100000, -1e9, 1e9).join(" ")}`,
         `100000\n${Array.from({ length: 100000 }, (_, i) => i - 50000).join(" ")}`,
         `100000\n${Array.from({ length: 100000 }, (_, i) => 1e9 - i).join(" ")}`,
         `100000\n${Array(100000).fill(-1e9).join(" ")}`,
         `100000\n${lisRandom.ints(100000, 1, 1000).join(" ")}`,
      ],
      check(input) {
         const lines = linesOf(input);
         assertLines(lines, 2);

         const n = Number(lines[0]);
         const numbers = numbersOf(lines[1]);

         assert(isInt(n, 1, 1e5) && numbers.length === n, "n");
         assert(numbers.every((x) => isInt(x, -1e9, 1e9)), "nums[i]");
      },
      solve(input) {
         const tails = [];

         for (const x of numbersOf(linesOf(input)[1])) {
            let lo = 0;
            let hi = tails.length;

            while (lo < hi) {
               const mid = (lo + hi) >> 1;

               if (tails[mid] < x) lo = mid + 1;
               else hi = mid;
            }

            tails[lo] = x;
         }

         return String(tails.length);
      },
   },
   {
      title: "Edit Distance",
      difficulty: "HARD",
      tags: ["dynamic-programming", "string"],
      supportedLanguages: ALL_LANGUAGES,
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      description: [
         "Count the fewest single character edits that turn the first word into the second. An edit inserts a character, removes one, or replaces one.",
         "",
         "**Input**",
         "",
         "Line 1: the first word. Line 2: the second word.",
         "",
         "**Output**",
         "",
         "The fewest edits.",
         "",
         "Trying every sequence of edits is far too slow. Build a table instead.",
      ].join("\n"),
      constraints: [
         "1 <= length of each word <= 500",
         "Words hold lowercase English letters (a-z) only",
      ],
      examples: [
         {
            input: "horse\nros",
            output: "3",
            explanation: "horse to rorse, to rose, to ros.",
         },
      ],
      starterCode: starter("fill a table of prefix against prefix"),
      samples: [
         { input: "horse\nros", explanation: "Replace, remove, remove." },
         { input: "same\nsame", explanation: "Nothing to change." },
      ],
      hidden: [
         "intention\nexecution",
         "a\nb",
         "abcdef\na",
         `${editRandom.word(500, LOWER)}\n${editRandom.word(500, LOWER)}`,
         `${"a".repeat(500)}\n${"b".repeat(500)}`,
         `${editRandom.word(500, LOWER)}\nq`,
         (() => {
            const word = editRandom.word(500, "ab");

            return `${word}\n${word.slice(0, 250)}${word.slice(251)}`;
         })(),
      ],
      check(input) {
         const lines = linesOf(input);
         assertLines(lines, 2);
         assert(
            lines.every((word) => /^[a-z]{1,500}$/.test(word)),
            "word",
         );
      },
      solve(input) {
         const [a, b] = linesOf(input);
         let previous = Array.from({ length: b.length + 1 }, (_, j) => j);

         for (let i = 1; i <= a.length; i += 1) {
            const current = [i];

            for (let j = 1; j <= b.length; j += 1) {
               current[j] =
                  a[i - 1] === b[j - 1]
                     ? previous[j - 1]
                     : 1 + Math.min(previous[j - 1], previous[j], current[j - 1]);
            }

            previous = current;
         }

         return String(previous[b.length]);
      },
   },
].map(withCases);

module.exports = problems;
