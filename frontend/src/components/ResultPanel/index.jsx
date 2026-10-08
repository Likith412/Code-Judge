import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { LANG_LABEL, RUNNABLE } from "../../utils/languages";
import { STATUS_LABEL, isPending, statusTone } from "../../utils/verdicts";

import "./index.css";

// After this long, queued stops looking like a flicker and gets explained.
const QUEUED_LONG_MS = 6000;

const elapsedText = (ms) => {
   const seconds = Math.floor(ms / 1000);

   return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

const VerdictTag = ({ status, children }) => (
   <span className={`verdict verdict-${statusTone(status)}`}>
      {isPending(status) && <span className="verdict-pulse" />}
      {children || STATUS_LABEL[status] || status}
   </span>
);

// One block per test: ink for passed, red for the failed one, grey for the rest.
const Segments = ({ submission, gap = "" }) => {
   const { totalTestCases, testCasesPassed, failedTestIndex, status } =
      submission;
   const pending = isPending(status);

   return (
      <div className={`result-segs ${gap}`}>
         {Array.from({ length: totalTestCases }, (_, index) => {
            const position = index + 1;
            let tone = "";

            if (!pending && position <= testCasesPassed)
               tone = "result-seg-pass";
            if (!pending && position === failedTestIndex)
               tone = "result-seg-fail";

            return <span key={position} className={`result-seg ${tone}`} />;
         })}
      </div>
   );
};

const OutputBox = ({ label, text, mine }) => (
   <div className="result-io-box">
      <div
         className={mine ? "result-io-label result-io-mine" : "result-io-label"}
      >
         {label}
      </div>

      <pre className={mine ? "result-io result-io-actual" : "result-io"}>
         {text || " "}
      </pre>
   </div>
);

const ResultPanel = (props) => {
   const {
      problem,
      language,
      signedIn,
      solves,
      attempt,
      sending,
      onRun,
      onSubmit,
   } = props;

   const submission = attempt?.submission;
   const pending = Boolean(submission) && isPending(submission.status);
   const runnable = RUNNABLE.includes(language);
   const canPress = signedIn && solves && runnable && !sending && !pending;

   // Ticks once a second, only while something is waiting.
   const [now, setNow] = useState(() => Date.now());

   useEffect(() => {
      if (!pending) return undefined;

      const timer = setInterval(() => setNow(Date.now()), 1000);

      return () => clearInterval(timer);
   }, [pending]);

   const gate = () => {
      if (!signedIn) return "Running code needs an account.";
      if (!solves) return "Setters and admins cannot run or submit.";
      if (!runnable)
         return `${LANG_LABEL[language] || language} cannot run yet. Switch to Java.`;
      if (sending || pending) return "";
      return "Run isn’t saved. Submit is.";
   };

   const meta = (row) =>
      [
         row.runtimeMs != null ? `${row.runtimeMs} ms` : "—",
         `${row.testCasesPassed}/${row.totalTestCases}`,
      ].join(" · ");

   const renderIdle = () => (
      <p className="result-idle">
         Nothing run yet. <strong>Run samples</strong> checks the{" "}
         {problem.sampleCount} sample cases and keeps nothing.{" "}
         <strong>Submit</strong> runs all {problem.testCount} tests, including
         hidden ones, and is saved to your history.
      </p>
   );

   // A sample run is quick and kept for a day only, so it gets no queue view.
   const renderRunning = () => (
      <div className="result-running">
         <span className="result-running-mark" />
         Running {problem.sampleCount} samples…
      </div>
   );

   const renderPending = () => {
      if (submission.isSampleRun) return renderRunning();

      // The clock can lag the press by up to a tick, so never show a negative.
      const waited = Math.max(0, now - attempt.startedAt);
      const queued = submission.status === "QUEUED";

      return (
         <>
            <div className="result-line">
               <VerdictTag status={submission.status} />

               <span className="result-elapsed">{elapsedText(waited)}</span>

               <span className="result-progress">
                  {queued ? "Waiting for a free worker" : "On a worker now"}
               </span>
            </div>

            {queued && waited > QUEUED_LONG_MS && (
               <p className="result-note">
                  Still queued. Your submission is saved and runs as soon as the
                  judge frees up. You can leave this page.
               </p>
            )}

            <Segments submission={submission} gap="result-segs-wide" />
         </>
      );
   };

   const renderError = (text, extra = "") =>
      text && <pre className={`result-error ${extra}`}>{text}</pre>;

   // Run: every sample gets a row, failures show what came out.
   const renderSampleRun = () => {
      const rows = submission.sampleResults || [];
      const passed = rows.filter((row) => row.status === "ACCEPTED").length;
      const summary =
         submission.status === "COMPILATION_ERROR" ||
         submission.status === "SYSTEM_ERROR"
            ? STATUS_LABEL[submission.status]
            : passed === rows.length
              ? `All ${rows.length} samples passed`
              : `${passed} of ${rows.length} samples passed`;

      return (
         <>
            <div className="result-line result-line-gap">
               <VerdictTag status={submission.status}>{summary}</VerdictTag>
               <span className="result-muted">Sample run · not saved</span>
            </div>

            {submission.status === "SYSTEM_ERROR" && (
               <p className="result-text">
                  Something went wrong on our side. Your code was not the
                  problem. Try again.
               </p>
            )}

            {renderError(submission.errorMessage, "result-error-run")}

            <div className="result-cases">
               {rows.map((row) => {
                  const ok = row.status === "ACCEPTED";

                  return (
                     <div className="result-case" key={row.position}>
                        <div className="result-case-head">
                           <span
                              className={
                                 ok
                                    ? "result-mark"
                                    : "result-mark result-mark-fail"
                              }
                           >
                              {ok ? "✓" : "✗"}
                           </span>
                           Sample {row.position}
                           {/* Wrong answer speaks for itself; a crash or limit does not. */}
                           {!ok && row.status !== "WRONG_ANSWER" && (
                              <span className="result-case-why">
                                 {STATUS_LABEL[row.status]}
                              </span>
                           )}
                        </div>

                        {/* Samples need not match the examples, so show what ran. */}
                        {!ok && (
                           <div className="result-io-grid result-io-grid-run">
                              <OutputBox label="Input" text={row.input} />
                              <OutputBox
                                 label="Expected"
                                 text={row.expectedOutput}
                              />
                              <OutputBox
                                 label="Your output"
                                 text={row.actualOutput}
                                 mine
                              />
                           </div>
                        )}
                     </div>
                  );
               })}
            </div>
         </>
      );
   };

   // What the design says under a failed verdict, one line or two.
   const failedText = () => {
      const { status, failedTestIndex: at, totalTestCases: total } = submission;
      const sample = submission.sampleResults?.[0];

      switch (status) {
         case "WRONG_ANSWER":
            return [
               `Failed on test ${at} of ${total}` +
                  (sample
                     ? " — a sample case, shown below."
                     : " — a hidden case, so its input isn’t shown."),
            ];
         case "TIME_LIMIT_EXCEEDED":
            return [
               `Test ${at} of ${total} ran past the ${problem.timeLimitMs} ms limit.`,
               "The limit is per test case, on the slowest one.",
            ];
         case "MEMORY_LIMIT_EXCEEDED":
            return [
               `Test ${at} of ${total} used more than the ${problem.memoryLimitMb} MB limit.`,
            ];
         case "RUNTIME_ERROR":
            return [`Crashed on test ${at} of ${total}.`];
         case "COMPILATION_ERROR":
            return ["Did not compile, so no tests ran."];
         default:
            return [];
      }
   };

   const renderAccepted = () => (
      <>
         <div className="result-accepted">
            <div className="result-accepted-kicker">Verdict</div>
            <div className="result-accepted-word">Accepted</div>
            <div className="result-accepted-meta">{meta(submission)}</div>
         </div>

         <Segments submission={submission} gap="result-segs-tight" />

         <div className="result-links">
            <Link to={`/submissions/${submission.id}`}>View submission</Link>
         </div>
      </>
   );

   const renderFailed = () => {
      const [line, hint] = failedText();
      const sample = submission.sampleResults?.[0];

      return (
         <>
            <div className="result-line">
               <VerdictTag status={submission.status} />
               <span className="result-meta">{meta(submission)}</span>
               <Link
                  className="result-open"
                  to={`/submissions/${submission.id}`}
               >
                  Open
               </Link>
            </div>

            <Segments submission={submission} />

            {line && <p className="result-text">{line}</p>}
            {hint && <p className="result-hint">{hint}</p>}

            {submission.status === "WRONG_ANSWER" && sample && (
               <div className="result-io-grid">
                  <OutputBox label="Input" text={sample.input} />
                  <OutputBox label="Expected" text={sample.expectedOutput} />
                  <OutputBox
                     label="Your output"
                     text={sample.actualOutput}
                     mine
                  />
               </div>
            )}

            {renderError(submission.errorMessage)}
         </>
      );
   };

   const renderSystem = () => (
      <>
         <div className="result-line">
            <VerdictTag status="SYSTEM_ERROR" />
            <span className="result-progress">{submission.id}</span>
         </div>

         <p className="result-text result-text-system">
            Something went wrong on our side while judging this. Your code
            wasn’t the problem and this attempt doesn’t count.
         </p>

         <button
            type="button"
            className="btn btn-primary result-again"
            onClick={onSubmit}
            disabled={!canPress}
         >
            Submit again
         </button>
      </>
   );

   const renderBody = () => {
      if (attempt?.error)
         return <p className="result-text result-fail-text">{attempt.error}</p>;
      if (!submission) return renderIdle();
      if (pending) return renderPending();
      if (submission.isSampleRun) return renderSampleRun();
      if (submission.status === "ACCEPTED") return renderAccepted();
      if (submission.status === "SYSTEM_ERROR") return renderSystem();
      return renderFailed();
   };

   return (
      <div className="result">
         <div className="result-bar">
            <button
               type="button"
               className="btn btn-secondary"
               onClick={onRun}
               disabled={!canPress}
            >
               Run samples
            </button>

            <button
               type="button"
               className="btn btn-primary result-submit"
               onClick={onSubmit}
               disabled={!canPress}
            >
               Submit
            </button>

            <span className="result-gate">{gate()}</span>
         </div>

         <div className="result-body" aria-live="polite">
            {renderBody()}
         </div>
      </div>
   );
};

export default ResultPanel;
