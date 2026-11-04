import { useContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";

import { getSubmission } from "../../services/api/submissions";
import { apiError } from "../../services/api/client";
import FailureView from "../../components/FailureView";
import OutputBox from "../../components/OutputBox";
import TestSegments from "../../components/TestSegments";
import VerdictTag from "../../components/VerdictTag";
import UserContext from "../../context/UserContext";
import { formatWhen } from "../../utils/date";
import { LANG_LABEL, MONACO_LANG } from "../../utils/languages";
import { failedText, isPending } from "../../utils/verdicts";

import "./index.css";

const apiStatusConstants = {
   initial: "INITIAL",
   success: "SUCCESS",
   failure: "FAILURE",
   inProgress: "IN_PROGRESS",
};

// Read only: no cursor line, minimap or overscroll; long lines wrap for phones.
const VIEWER_OPTIONS = {
   readOnly: true,
   wordWrap: "on",
   domReadOnly: true,
   minimap: { enabled: false },
   scrollBeyondLastLine: false,
   renderLineHighlight: "none",
   fontSize: 13,
};

const SubmissionPage = () => {
   const { submissionId } = useParams();
   const { user } = useContext(UserContext);

   const [data, setData] = useState(null);
   const [apiStatus, setApiStatus] = useState(apiStatusConstants.initial);
   const [failure, setFailure] = useState(null);
   const [reloadCount, setReloadCount] = useState(0);

   useEffect(() => {
      let cancelled = false;

      const load = async () => {
         setApiStatus(apiStatusConstants.inProgress);

         try {
            const response = await getSubmission(submissionId);

            if (cancelled) return;

            setData(response);
            setApiStatus(apiStatusConstants.success);
         } catch (error) {
            if (cancelled) return;

            setFailure(apiError(error));
            setApiStatus(apiStatusConstants.failure);
         }
      };

      load();

      return () => {
         cancelled = true;
      };
   }, [submissionId, reloadCount]);

   const renderResult = (submission, problem) => {
      if (isPending(submission.status)) {
         return (
            <p className="sub-text">
               Still being judged. Open this page again in a moment.
            </p>
         );
      }

      if (submission.status === "SYSTEM_ERROR") {
         return (
            <p className="sub-text">
               This failed on our side, not yours. It doesn’t count against you.
               Submit it again from the problem page.
            </p>
         );
      }

      const [line, hint] = failedText(submission, problem || {});
      const sample = submission.sampleResults?.[0];

      return (
         <>
            <TestSegments submission={submission} gap="sub-segs" />

            <p className="sub-text">
               {submission.testCasesPassed} of {submission.totalTestCases} tests
               passed
            </p>

            {line && <p className="sub-text">{line}</p>}
            {hint && <p className="sub-hint">{hint}</p>}

            {submission.status === "WRONG_ANSWER" && sample && (
               <div className="result-io-grid">
                  <OutputBox label="Input" text={sample.input} />
                  <OutputBox label="Expected" text={sample.expectedOutput} />
                  <OutputBox label="Output" text={sample.actualOutput} mine />
               </div>
            )}

            {submission.errorMessage && (
               <pre className="sub-error">{submission.errorMessage}</pre>
            )}
         </>
      );
   };

   const renderDetail = () => {
      const { submission, problem, contest } = data;

      return (
         <main className="cj-main">
            {/* Only a USER has a submissions list to go back to. */}
            {user?.role !== "ADMIN" && (
               <Link className="sub-back" to="/submissions">
                  ← Submissions
               </Link>
            )}

            <header className="sub-header">
               <div>
                  <h1 className="sub-title">
                     {problem ? (
                        <Link
                           to={
                              contest
                                 ? `/contests/${contest.slug}/problems/${problem.slug}`
                                 : `/problems/${problem.slug}`
                           }
                        >
                           {problem.title}
                        </Link>
                     ) : (
                        "Deleted problem"
                     )}
                  </h1>

                  <div className="sub-meta">
                     {LANG_LABEL[submission.language] || submission.language} ·
                     submitted {formatWhen(submission.createdAt)}
                  </div>
               </div>

               <div className="sub-verdict">
                  <VerdictTag status={submission.status} />
                  <span className="sub-passed">
                     {submission.testCasesPassed}/{submission.totalTestCases}
                  </span>
               </div>
            </header>

            <div className="sub-grid">
               <section>
                  <div className="sub-label">Source · read only</div>

                  <div className="sub-code">
                     <Editor
                        language={
                           MONACO_LANG[submission.language] || "plaintext"
                        }
                        value={submission.sourceCode}
                        options={VIEWER_OPTIONS}
                        loading={
                           <pre className="sub-code-plain">
                              {submission.sourceCode}
                           </pre>
                        }
                     />
                  </div>
               </section>

               <section>
                  <div className="sub-label">Result</div>
                  {renderResult(submission, problem)}
               </section>
            </div>
         </main>
      );
   };

   // Someone else's, or one that never existed: both are a plain 404.
   const renderMissing = () => (
      <main className="cj-main-narrow">
         <h1 className="cj-screen-title">No such submission</h1>

         <p className="cj-prose">
            It does not exist, or it belongs to someone else.
         </p>

         {user?.role === "ADMIN" ? (
            <Link className="btn btn-primary" to="/admin/users">
               Back to users
            </Link>
         ) : (
            <Link className="btn btn-primary" to="/submissions">
               Back to submissions
            </Link>
         )}
      </main>
   );

   switch (apiStatus) {
      case apiStatusConstants.success:
         return renderDetail();
      case apiStatusConstants.failure:
         return failure.status === 404 || failure.status === 422 ? (
            renderMissing()
         ) : (
            <FailureView
               message={failure.message}
               onRetry={() => setReloadCount((count) => count + 1)}
            />
         );
      case apiStatusConstants.inProgress:
         return (
            <main className="cj-main">
               <p className="sub-loading">Loading submission…</p>
            </main>
         );
      default:
         return null;
   }
};

export default SubmissionPage;
