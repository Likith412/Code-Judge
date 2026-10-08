// WARNING: local development only. This runs submitted code on your own
// machine with no wall around it. Phase 5 replaces it with a Docker sandbox.
const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

// Kept from stdout. A program that prints more is stopped.
const OUTPUT_LIMIT_BYTES = 64 * 1024;
const COMPILE_TIMEOUT_MS = 20_000;

// What each language needs. Python and C++ arrive in phase 8.
const RUNNERS = {
   java: {
      file: "Main.java",
      // Compile once, not on every case, so compile errors are told apart cleanly.
      compile: () => ["javac", ["-encoding", "UTF-8", "Main.java"]],
      run: ({ memoryLimitMb }) => [
         "java",
         [`-Xmx${memoryLimitMb}m`, "-XX:+UseSerialGC", "-cp", ".", "Main"],
      ],
      // The JVM's own heap limit is how memory is enforced without Docker.
      outOfMemory: (stderr) => stderr.includes("java.lang.OutOfMemoryError"),
   },
};

const canRun = (language) => Boolean(RUNNERS[language]);

// Holds output up to a size limit and says when it went over.
function collector(limit) {
   const chunks = [];
   let size = 0;

   return {
      push(chunk) {
         if (size < limit) chunks.push(chunk.subarray(0, limit - size));
         size += chunk.length;

         return size <= limit;
      },
      text: () => Buffer.concat(chunks).toString("utf8"),
   };
}

// Runs one command to the end, or until the timer or the output limit stops it.
function execute(command, args, { cwd, input = "", timeoutMs }) {
   return new Promise((resolve, reject) => {
      const started = process.hrtime.bigint();
      const child = spawn(command, args, { cwd });
      const stdout = collector(OUTPUT_LIMIT_BYTES);
      const stderr = collector(OUTPUT_LIMIT_BYTES);

      let timedOut = false;
      let overflow = false;

      const timer = setTimeout(() => {
         timedOut = true;
         child.kill("SIGKILL");
      }, timeoutMs);

      child.stdout.on("data", (chunk) => {
         if (!stdout.push(chunk) && !overflow) {
            overflow = true;
            child.kill("SIGKILL");
         }
      });
      child.stderr.on("data", (chunk) => stderr.push(chunk));

      // A missing compiler is the server's fault, not the user's.
      child.on("error", (err) => {
         clearTimeout(timer);
         reject(err);
      });

      child.on("close", (code) => {
         clearTimeout(timer);
         resolve({
            code,
            timedOut,
            overflow,
            stdout: stdout.text(),
            stderr: stderr.text(),
            ms: Number((process.hrtime.bigint() - started) / 1_000_000n),
         });
      });

      // A program may exit without reading its input. That is not an error.
      child.stdin.on("error", () => {});
      child.stdin.end(input);
   });
}

// A fresh folder with the source in it, compiled if the language needs it.
async function prepare(language, sourceCode) {
   const runner = RUNNERS[language];
   const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cj-"));

   await fs.writeFile(path.join(dir, runner.file), sourceCode);

   const [command, args] = runner.compile();
   const result = await execute(command, args, {
      cwd: dir,
      timeoutMs: COMPILE_TIMEOUT_MS,
   });

   const compileError =
      result.code === 0
         ? null
         : result.stderr || result.stdout || "The compiler gave up";

   return { dir, compileError };
}

// One case, raw: the caller turns this into a verdict.
async function runOne(dir, language, input, limits) {
   const runner = RUNNERS[language];
   const [command, args] = runner.run(limits);
   const result = await execute(command, args, {
      cwd: dir,
      input,
      timeoutMs: limits.timeLimitMs,
   });

   return { ...result, outOfMemory: runner.outOfMemory(result.stderr) };
}

const cleanup = (dir) => fs.rm(dir, { recursive: true, force: true });

module.exports = { canRun, prepare, runOne, cleanup, OUTPUT_LIMIT_BYTES };
