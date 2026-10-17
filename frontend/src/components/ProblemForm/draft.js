// Moving a problem between the server's shape and the form's shape.

const JAVA_STARTER = [
   "import java.util.*;",
   "",
   "public class Main {",
   "   public static void main(String[] args) {",
   "      Scanner sc = new Scanner(System.in);",
   "   }",
   "}",
].join("\n");

const EMPTY_DRAFT = {
   title: "",
   slug: "",
   description: "",
   difficulty: "EASY",
   tagsText: "",
   timeLimitMs: 2000,
   memoryLimitMb: 256,
   comparisonMode: "TRIM",
   constraints: [],
   examples: [],
   supportedLanguages: ["java"],
   starterCode: { java: JAVA_STARTER, python: "", cpp: "" },
};

// The server's shape into the form's shape.
const toDraft = (problem) => ({
   title: problem.title,
   slug: problem.slug,
   description: problem.description,
   difficulty: problem.difficulty,
   tagsText: problem.tags.join(", "),
   timeLimitMs: problem.timeLimitMs,
   memoryLimitMb: problem.memoryLimitMb,
   comparisonMode: problem.comparisonMode,
   constraints: problem.constraints,
   examples: problem.examples.map((example) => ({
      input: example.input,
      output: example.output,
      explanation: example.explanation || "",
   })),
   supportedLanguages: problem.supportedLanguages,
   starterCode: { java: "", python: "", cpp: "", ...problem.starterCode },
});

// The form back into a request body. Empty rows are dropped, not sent.
function toBody(draft) {
   const body = {
      title: draft.title.trim(),
      description: draft.description,
      difficulty: draft.difficulty,
      tags: draft.tagsText
         .split(",")
         .map((tag) => tag.trim().toLowerCase())
         .filter(Boolean),
      timeLimitMs: Number(draft.timeLimitMs),
      memoryLimitMb: Number(draft.memoryLimitMb),
      comparisonMode: draft.comparisonMode,
      constraints: draft.constraints.map((line) => line.trim()).filter(Boolean),
      examples: draft.examples
         .filter((example) => example.input || example.output)
         .map((example) => ({
            input: example.input,
            output: example.output,
            ...(example.explanation.trim()
               ? { explanation: example.explanation.trim() }
               : {}),
         })),
      supportedLanguages: draft.supportedLanguages,
      // Only the languages it takes, or a removed one would linger.
      starterCode: Object.fromEntries(
         draft.supportedLanguages.map((language) => [
            language,
            draft.starterCode[language] || "",
         ]),
      ),
   };

   // Left out on a new problem, the server builds it from the title.
   if (draft.slug.trim()) body.slug = draft.slug.trim();

   return body;
}

// "examples.0.input" reads as "Example 1 input" in the list of problems.
const FIELD_NAMES = {
   title: "Title",
   slug: "Slug",
   description: "Description",
   difficulty: "Difficulty",
   tags: "Tags",
   timeLimitMs: "Time limit",
   memoryLimitMb: "Memory",
   constraints: "Constraints",
   examples: "Examples",
   supportedLanguages: "Languages",
   starterCode: "Starter code",
};

const fieldName = (path) => {
   const [first, index, rest] = path.split(".");
   const name = FIELD_NAMES[first] || first;

   return index === undefined
      ? name
      : `${name} ${Number(index) + 1}${rest ? ` ${rest}` : ""}`;
};

export { EMPTY_DRAFT, toDraft, toBody, fieldName };
