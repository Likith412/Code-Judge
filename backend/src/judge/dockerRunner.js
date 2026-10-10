// Runs submitted code inside a locked-down container, one per submission.
const crypto = require("node:crypto");
const { PassThrough } = require("node:stream");

const docker = require("../config/docker");

// stdout may be twice the expected answer, within these bounds. More is stopped.
const OUTPUT_MIN_BYTES = 64 * 1024;
const OUTPUT_MAX_BYTES = 8 * 1024 * 1024;

// stderr is only ever shown cut short, so it gets the small limit.
const STDERR_LIMIT_BYTES = 64 * 1024;
const COMPILE_TIMEOUT_MS = 30_000;

// The time limit is CPU time. Wall time gets slack for a busy machine, and
// still stops a program that only sleeps or waits on input.
const wallCapMs = (timeLimitMs) => timeLimitMs * 2 + 500;

// Past the wall cap + grace, Node stops waiting and kills the container itself.
const WALL_GRACE_MS = 2_000;

// Every sandbox carries this, so a restart can find and remove leftovers.
const BOX_LABEL = "code-judge.box";

const MB = 1024 * 1024;

// One image per language. Python and C++ arrive in phase 8.
const RUNNERS = {
   java: {
      image: "code-judge-java",
      file: "Main.java",
      // Hitting the process cap also says OutOfMemoryError. That one is a crash.
      outOfMemory: (stderr) =>
         stderr.includes("java.lang.OutOfMemoryError") &&
         !stderr.includes("unable to create native thread"),
      // stderr is the program's to write, so on a hidden test only a name from
      // this list may come back. Anything else could carry the hidden input.
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

// judge.sh speaks in exit codes.
const EXIT = { COMPILE_ERROR: 20, TIMEOUT: 124, KILLED: 137 };

const canRun = (language) => Boolean(RUNNERS[language]);

// Room for a correct answer of any size the problem allows.
const outputLimitFor = (expectedOutput) =>
   Math.min(
      OUTPUT_MAX_BYTES,
      Math.max(OUTPUT_MIN_BYTES, 2 * Buffer.byteLength(expectedOutput) + 1024),
   );

// The safe name of a crash: one listed name, or null. Never stderr's own text.
function crashName(language, stderr) {
   return (
      RUNNERS[language].crashNames.find((name) =>
         new RegExp(`\\b${name}\\b`).test(stderr),
      ) || null
   );
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

/* ---- the box: one container for one submission ------------------------ */

// Kill and remove. Every caller waits on the same removal, so a second
// call cannot return while the first is still deleting the container.
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
         // Equal to memory, so there is no swap to hide in.
         MemorySwap: memoryLimitMb * MB,
         NanoCpus: 1e9,
         PidsLimit: 64,
         ReadonlyRootfs: true,
         // The only writable places, small and owned by the sandbox user.
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

// The exit code lands a moment after the output stream closes.
async function exitCode(execution) {
   for (let attempt = 0; attempt < 50; attempt += 1) {
      const info = await execution.inspect();

      if (!info.Running) return info.ExitCode;
      await sleep(20);
   }

   throw new Error("The program never reported an exit code");
}

// One command inside the box, to the end or until the timer or the output
// limit stops it. Docker's own failures throw, so they end as SYSTEM_ERROR.
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

   // Closing the stream leaves the program running, so stopping kills the box.
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

   // Send the input and close stdin, so a program reading to the end stops.
   stream.end(input);
   await finished;
   clearTimeout(timer);

   const ms = Number((process.hrtime.bigint() - started) / 1_000_000n);

   return {
      // A killed box has no exit code to ask for.
      code: box.dead ? null : await exitCode(execution),
      timedOut,
      overflow,
      stdout: stdout.text(),
      stderr: stderr.text(),
      ms,
   };
}

// A started box with the source in it, compiled. The caller must clean up.
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

// CPU used by everything in the box so far, from Docker's own counters.
async function cpuNanos(box) {
   const stats = await box.container.stats({ stream: false, "one-shot": true });

   return stats.cpu_stats.cpu_usage.total_usage;
}

// One case, raw: the caller turns this into a verdict.
// ms is CPU time. stop is true when the box had to be killed.
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

   // A killed box has no counters left, so wall time stands in.
   const cpuMs = box.dead
      ? result.ms
      : Math.round((Number(await cpuNanos(box)) - Number(before)) / 1e6);

   // We killed it, so there is no exit code to read anything from.
   const stoppedByUs = result.timedOut || result.overflow;

   return {
      ...result,
      ms: cpuMs,
      wallMs: result.ms,
      outputLimit,
      timedOut:
         result.timedOut || result.code === EXIT.TIMEOUT || cpuMs > timeLimitMs,
      // 137 is the kernel's out-of-memory kill. The JVM may also catch it first.
      outOfMemory:
         !stoppedByUs &&
         (result.code === EXIT.KILLED || runner.outOfMemory(result.stderr)),
      crashName: crashName(box.language, result.stderr),
      stop: box.dead,
   };
}

const cleanup = (box) => destroy(box);

/* ---- housekeeping ------------------------------------------------------ */

// Boxes left by a crash or a restart. Nothing should be running at startup.
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

// The images every language needs. Missing ones are built by npm run judge:images.
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
   canRun,
   prepare,
   runOne,
   cleanup,
   removeLeftovers,
   missingImages,
};
