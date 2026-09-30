import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Markdown from "react-markdown";

import { getProblem } from "../../services/api/problems";
import { apiError } from "../../services/api/client";
import DifficultyTag from "../../components/DifficultyTag";
import CopyButton from "../../components/CopyButton";
import FailureView from "../../components/FailureView";

import "./index.css";

const apiStatusConstants = {
   initial: "INITIAL",
   success: "SUCCESS",
   failure: "FAILURE",
   inProgress: "IN_PROGRESS",
};

const ProblemPage = () => {
   const { slug } = useParams();

   const [problem, setProblem] = useState(null);
   const [apiStatus, setApiStatus] = useState(apiStatusConstants.initial);
   const [failure, setFailure] = useState(null);
   const [reloadCount, setReloadCount] = useState(0);

   useEffect(() => {
      let cancelled = false;

      const load = async () => {
         setApiStatus(apiStatusConstants.inProgress);

         try {
            const data = await getProblem(slug);

            if (cancelled) return;

            setProblem(data.problem);
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
   }, [slug, reloadCount]);

   const renderHead = () => (
      <div className="problem-head">
         <div className="problem-head-line">
            <h1 className="problem-title">{problem.title}</h1>

            <DifficultyTag difficulty={problem.difficulty} />
         </div>

         <div className="problem-meta">
            <span className="problem-meta-mono">
               Time {problem.timeLimitMs} ms
            </span>

            <span className="problem-meta-mono">
               Memory {problem.memoryLimitMb} MB
            </span>

            <span className="problem-meta-item">
               {problem.testCaseCount} tests
            </span>

            <span className="problem-meta-item">
               {problem.acceptanceRate === null
                  ? "No submissions yet"
                  : `${problem.acceptanceRate}% accepted`}
            </span>
         </div>

         <div className="problem-tags">
            {problem.tags.map((tag) => (
               <span className="tag tag-neutral" key={tag}>
                  {tag}
               </span>
            ))}
         </div>
      </div>
   );

   const renderExamples = () => (
      <>
         <h6 className="problem-h6">Examples</h6>

         <div className="problem-examples">
            {problem.examples.map((example, index) => (
               <div className="problem-example" key={example.input + index}>
                  <div className="problem-example-head">
                     <span className="problem-example-name">
                        Example {index + 1}
                     </span>

                     <CopyButton text={example.input} label="Copy input" />
                  </div>

                  <div className="problem-io">
                     <div>
                        <div className="problem-io-label">Input</div>
                        <pre className="problem-io-text">{example.input}</pre>
                     </div>

                     <div>
                        <div className="problem-io-label">Output</div>
                        <pre className="problem-io-text">{example.output}</pre>
                     </div>
                  </div>

                  {example.explanation && (
                     <p className="problem-example-note">
                        {example.explanation}
                     </p>
                  )}
               </div>
            ))}
         </div>
      </>
   );

   const renderQuestion = () => (
      <section className="problem-question">
         {renderHead()}

         <div className="problem-body">
            <div className="problem-prose">
               <Markdown>{problem.description}</Markdown>
            </div>

            {problem.constraints.length > 0 && (
               <>
                  <h6 className="problem-h6">Constraints</h6>

                  <ul className="problem-constraints">
                     {problem.constraints.map((line) => (
                        <li key={line}>{line}</li>
                     ))}
                  </ul>
               </>
            )}

            {problem.examples.length > 0 && renderExamples()}
         </div>
      </section>
   );

   // Phase 3 puts the editor and the result panel in here.
   const renderEditorSlot = () => (
      <section className="problem-editor-slot">
         <p className="problem-editor-note">
            The editor arrives in phase 3. For now this problem can be read but
            not solved.
         </p>
      </section>
   );

   const renderMissing = () => (
      <main className="cj-main-narrow">
         <h1 className="cj-screen-title">No such problem</h1>

         <p className="cj-prose">
            Nothing lives at <span className="cj-num">{slug}</span>. It may have
            been renamed, or it may not be published yet.
         </p>

         <Link className="btn btn-primary" to="/problems">
            Back to problems
         </Link>
      </main>
   );

   // A draft or an unknown slug is a 404, which reads better than an error.
   const renderFailure = () =>
      failure.status === 404 ? (
         renderMissing()
      ) : (
         <FailureView
            message={failure.message}
            onRetry={() => setReloadCount((count) => count + 1)}
         />
      );

   switch (apiStatus) {
      case apiStatusConstants.success:
         return (
            <div className="problem-split">
               {renderQuestion()}
               {renderEditorSlot()}
            </div>
         );
      case apiStatusConstants.failure:
         return renderFailure();
      case apiStatusConstants.inProgress:
         return (
            <main className="cj-main">
               <p className="problem-loading">Loading problem…</p>
            </main>
         );
      default:
         return null;
   }
};

export default ProblemPage;
