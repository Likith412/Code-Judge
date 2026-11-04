import { Link } from "react-router-dom";

import { LANG_LABEL, RUNNABLE } from "../../utils/languages";
import { STATUS_LABEL, failedText, isPending } from "../../utils/verdicts";
import OutputBox from "../OutputBox";
import TestSegments from "../TestSegments";
import VerdictTag from "../VerdictTag";

import "./index.css";

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
      contestOpen = true,
   } = props;

   const submission = attempt?.submission;
   const pending = Boolean(submission) && isPending(submission.status);
   const runnable = RUNNABLE.includes(language);
   const canPress =
      signedIn && solves && runnable && contestOpen && !sending && !pending;

   const gate = () => {
      if (!signedIn) return "Running code needs an account.";
      if (!solves) return "Setters and admins cannot run or submit.";

      if (!runnable)
         return `${LANG_LABEL[language] || language} cannot run yet. Switch to Java.`;

      if (sending || pending) return "";

      return "Run isn’t saved. Submit is.";
   };

   const meta = (row) => `${row.testCasesPassed}/${row.totalTestCases}`;

   const renderIdle = () => (
      <p className="result-idle">
         Nothing run yet. <strong>Run samples</strong> checks the{" "}
         {problem.sampleCount} sample cases and keeps nothing.{" "}
         <strong>Submit</strong> runs all {problem.testCount} tests, including
         hidden ones, and is saved to your history.
      </p>
   );

   // One status, centred: Queued…, then Running….
   const renderPending = () => (
      <div className="result-waiting" role="status">
         <span className="result-spinner" />
         {STATUS_LABEL[submission.status]}…
      </div>
   );

   const renderError = (text, extra = "") =>
      text && <pre className={`result-error ${extra}`}>{text}</pre>;

   // Run: every sample gets a row with its input and output.
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

                        {/* Every sample shows what ran, passed or not. */}
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
                              passed={ok}
                           />
                        </div>
                     </div>
                  );
               })}
            </div>
         </>
      );
   };

   const renderAccepted = () => (
      <>
         <div className="result-accepted">
            <div className="result-accepted-kicker">Verdict</div>
            <div className="result-accepted-word">Accepted</div>
            <div className="result-accepted-meta">{meta(submission)}</div>
         </div>

         <TestSegments submission={submission} gap="result-segs-tight" />

         <div className="result-links">
            <Link to={`/submissions/${submission.id}`}>View submission</Link>
         </div>
      </>
   );

   const renderFailed = () => {
      const [line, hint] = failedText(submission, problem);
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

            <TestSegments submission={submission} />

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
