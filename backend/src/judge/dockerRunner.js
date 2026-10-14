// Runs user code in a safe container, one per submission.
const crypto = require("node:crypto");
const { PassThrough } = require("node:stream");

const docker = require("../config/docker");

// stdout can be up to twice the expected answer, kept between these sizes.
const OUTPUT_MIN_BYTES = 64 * 1024;
const OUTPUT_MAX_BYTES = 8 * 1024 * 1024;

// stderr is only shown in short form, so a small limit is enough.
const STDERR_LIMIT_BYTES = 64 * 1024;
const COMPILE_TIMEOUT_MS = 30_000;

// The limit is CPU time. Wall time gets extra room but still stops sleepers.
const wallCapMs = (timeLimitMs) => timeLimitMs * 2 + 500;

// After the wall cap plus this, we kill the container ourselves.
const WALL_GRACE_MS = 2_000;

// Label on every box, so leftovers can be found after a restart.
const BOX_LABEL = "code-judge.box";

const MB = 1024 * 1024;

// One image per language. Keep JUDGED_LANGUAGES in utils/constants.js in step.
const RUNNERS = {
   java: {
      image: "code-judge-java",
      file: "Main.java",
      // Too many threads also says OutOfMemoryError. Treat that as a crash.
      outOfMemory: (stderr) =>
         stderr.includes("java.lang.OutOfMemoryError") &&
         !stderr.includes("unable to create native thread"),
      // Only names from this list are shown, so hidden test input never leaks.
      crashNames: [
         "ArithmeticException",
         "ArrayIndexOutOfBoundsException",
         "StringIndexOutOfBoundsException",
         "IndexOutOfBoundsException",
         "NegativeArraySizeException",
         "NullPointerException",
         "NumberFormatException",
         "InputMismatchException",
         "NoSuchElementException",
         "ClassCastException",
         "IllegalArgumentException",
         "IllegalStateException",
         "ConcurrentModificationException",
         "UnsupportedOperationException",
         "StackOverflowError",
      ],
   },
};

// Exit codes used by judge.sh.
const EXIT = { COMPILE_ERROR: 20, TIMEOUT: 124, KILLED: 137 };

// Enough room for any correct answer.
const outputLimitFor = (expectedOutput) =>
   Math.min(
      OUTPUT_MAX_BYTES,
      Math.max(OUTPUT_MIN_BYTES, 2 * Buffer.byteLength(expectedOutput) + 1024),
   );

// Returns a known crash name or null. Never the raw stderr.
function crashName(language, stderr) {
   return (
      RUNNERS[language].crashNames.find((name) =>
         new RegExp(`\\b${name}\\b`).test(stderr),
      ) || null
   );
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Keeps output up to a limit and tells when it goes over.
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

/* ---- the box: one container for one submission ------------------------ */

// Kill and remove the box. Repeat calls wait on the same removal.
function destroy(box) {
   box.dead = true;
   box.removing ??= box.container.remove({ force: true }).catch(() => {});

   return box.removing;
}

async function startBox(language, { memoryLimitMb }) {
   const container = await docker.createContainer({
      Image: RUNNERS[language].image,
      name: `cj-${crypto.randomUUID().slice(0, 13)}`,
      Labels: { [BOX_LABEL]: "1" },
      User: "1000:1000",
      NetworkDisabled: true,
      HostConfig: {
         NetworkMode: "none",
         AutoRemove: true,
         Memory: memoryLimitMb * MB,
         // Same as memory, so there is no swap.
         MemorySwap: memoryLimitMb * MB,
         NanoCpus: 1e9,
         PidsLimit: 64,
         ReadonlyRootfs: true,
         // The only writable folders, small and owned by the sandbox user.
         Tmpfs: {
            "/box": "rw,size=64m,uid=1000,gid=1000,mode=700",
            "/tmp": "rw,size=16m,uid=1000,gid=1000,mode=700",
         },
         CapDrop: ["ALL"],
         SecurityOpt: ["no-new-privileges"],
      },
   });

   const box = { container, language, dead: false };

   try {
      await container.start();
   } catch (err) {
      await destroy(box);
      throw err;
   }

   return box;
}

// The exit code shows up just after the output stream closes.
async function exitCode(execution) {
   for (let attempt = 0; attempt < 50; attempt += 1) {
      const info = await execution.inspect();

      if (!info.Running) return info.ExitCode;
      await sleep(20);
   }

   throw new Error("The program never reported an exit code");
}

// Runs one command in the box. Stops on timeout or too much output.
async function exec(
   box,
   cmd,
   { input = "", timeoutMs, outputLimit = OUTPUT_MIN_BYTES },
) {
   const execution = await box.container.exec({
      Cmd: cmd,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
   });
   const stream = await execution.start({ hijack: true, stdin: true });
   const started = process.hrtime.bigint();

   const stdout = collector(outputLimit);
   const stderr = collector(STDERR_LIMIT_BYTES);
   const out = new PassThrough();
   const err = new PassThrough();

   let timedOut = false;
   let overflow = false;

   // Closing the stream does not stop the program, so kill the box.
   const halt = () => {
      destroy(box);
      stream.destroy();
   };

   out.on("data", (chunk) => {
      if (!stdout.push(chunk) && !overflow) {
         overflow = true;
         halt();
      }
   });
   err.on("data", (chunk) => stderr.push(chunk));
   docker.modem.demuxStream(stream, out, err);

   const finished = new Promise((resolve) => {
      stream.once("end", resolve);
      stream.once("close", resolve);
      stream.once("error", resolve);
   });

   const timer = setTimeout(() => {
      timedOut = true;
      halt();
   }, timeoutMs);

   // Send input, then close stdin so the program sees the end.
   stream.end(input);
   await finished;
   clearTimeout(timer);

   const ms = Number((process.hrtime.bigint() - started) / 1_000_000n);

   return {
      // A killed box has no exit code.
      code: box.dead ? null : await exitCode(execution),
      timedOut,
      overflow,
      stdout: stdout.text(),
      stderr: stderr.text(),
      ms,
   };
}

// Starts a box, copies the code in, and compiles it. Caller must clean up.
async function prepare(language, sourceCode, limits) {
   const box = await startBox(language, limits);

   try {
      const file = RUNNERS[language].file;
      const write = await exec(box, ["sh", "-c", `cat > /box/${file}`], {
         input: sourceCode,
         timeoutMs: 10_000,
      });

      if (write.code !== 0) throw new Error("Could not copy the code in");

      const compile = await exec(box, ["/judge/judge.sh", "compile"], {
         timeoutMs: COMPILE_TIMEOUT_MS,
      });

      if (compile.timedOut) {
         return { box, compileError: "The compiler ran out of time" };
      }

      if (compile.code === EXIT.COMPILE_ERROR) {
         return {
            box,
            compileError: compile.stderr || compile.stdout || "Did not compile",
         };
      }

      if (compile.code !== 0) {
         throw new Error(`The compile step exited with ${compile.code}`);
      }

      return { box, compileError: null };
   } catch (err) {
      await destroy(box);
      throw err;
   }
}

// Total CPU used in the box so far, from Docker stats.
async function cpuNanos(box) {
   const stats = await box.container.stats({ stream: false, "one-shot": true });

   return stats.cpu_stats.cpu_usage.total_usage;
}

// Runs one test case. ms is CPU time, stop means the box was killed.
async function runOne(box, testCase, { timeLimitMs }) {
   const runner = RUNNERS[box.language];
   const wallMs = wallCapMs(timeLimitMs);
   const outputLimit = outputLimitFor(testCase.expectedOutput);

   const before = await cpuNanos(box);
   const result = await exec(
      box,
      ["/judge/judge.sh", "run", String(wallMs / 1000)],
      { input: testCase.input, timeoutMs: wallMs + WALL_GRACE_MS, outputLimit },
   );

   // A killed box has no stats, so use wall time.
   const cpuMs = box.dead
      ? result.ms
      : Math.round((Number(await cpuNanos(box)) - Number(before)) / 1e6);

   // We killed it, so its exit code tells us nothing.
   const stoppedByUs = result.timedOut || result.overflow;

   return {
      ...result,
      ms: cpuMs,
      wallMs: result.ms,
      outputLimit,
      timedOut:
         result.timedOut || result.code === EXIT.TIMEOUT || cpuMs > timeLimitMs,
      // 137 means out of memory. The JVM may also catch it first.
      outOfMemory:
         !stoppedByUs &&
         (result.code === EXIT.KILLED || runner.outOfMemory(result.stderr)),
      crashName: crashName(box.language, result.stderr),
      stop: box.dead,
   };
}

const cleanup = (box) => destroy(box);

/* ---- housekeeping ------------------------------------------------------ */

// Removes boxes left over from a crash or restart.
async function removeLeftovers() {
   const rows = await docker.listContainers({
      all: true,
      filters: { label: [BOX_LABEL] },
   });

   await Promise.all(
      rows.map((row) =>
         docker
            .getContainer(row.Id)
            .remove({ force: true })
            .catch(() => {}),
      ),
   );

   return rows.length;
}

// Lists missing images. Build them with npm run judge:images.
async function missingImages() {
   const missing = [];

   for (const { image } of Object.values(RUNNERS)) {
      try {
         await docker.getImage(image).inspect();
      } catch (err) {
         if (err.statusCode !== 404) throw err;
         missing.push(image);
      }
   }

   return missing;
}

module.exports = {
   prepare,
   runOne,
   cleanup,
   removeLeftovers,
   missingImages,
};
