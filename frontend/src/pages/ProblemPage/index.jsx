import { useContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Markdown from "react-markdown";

import { getProblem } from "../../services/api/problems";
import { apiError } from "../../services/api/client";
import DifficultyTag from "../../components/DifficultyTag";
import CopyButton from "../../components/CopyButton";
import FailureView from "../../components/FailureView";
import CodeEditor from "../../components/CodeEditor";
import ResultPanel from "../../components/ResultPanel";
import UserContext from "../../context/UserContext";
import { LANG_LABEL } from "../../utils/languages";

import "./index.css";

const apiStatusConstants = {
   initial: "INITIAL",
   success: "SUCCESS",
   failure: "FAILURE",
   inProgress: "IN_PROGRESS",
};

// The design opens at 46% question, 260px of result.
const SPLIT = { start: 46, min: 25, max: 75 };
const RESULT = { start: 260, min: 120, max: 520 };
const NARROW = 900;

const mobileTabs = [
   { value: "problem", label: "Problem" },
   { value: "code", label: "Code" },
   { value: "result", label: "Result" },
];

const ProblemPage = () => {
   const { slug } = useParams();

   const { user } = useContext(UserContext);

   // Only a USER submits code, so only a USER gets a writable editor.
   const solves = user?.role === "USER";

   const [problem, setProblem] = useState(null);
   const [apiStatus, setApiStatus] = useState(apiStatusConstants.initial);
   const [failure, setFailure] = useState(null);
   const [reloadCount, setReloadCount] = useState(0);

   const [syncedSlug, setSyncedSlug] = useState(null);
   const [language, setLanguage] = useState("");
   const [drafts, setDrafts] = useState({});

   const [split, setSplit] = useState(SPLIT.start);
   const [resultH, setResultH] = useState(RESULT.start);
   const [mtab, setMtab] = useState("problem");
   const [resetConfirm, setResetConfirm] = useState(false);
   const [view, setView] = useState({ height: 0, width: 0, narrow: false });

   // The shell fills what the navbar leaves, measured rather than calculated.
   useEffect(() => {
      const measure = () => {
         const nav = document.querySelector(".cj-nav");

         setView({
            height: window.innerHeight - (nav ? nav.offsetHeight : 0),
            width: window.innerWidth,
            narrow: window.innerWidth <= NARROW,
         });
      };

      measure();
      window.addEventListener("resize", measure);

      return () => window.removeEventListener("resize", measure);
   }, []);

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

   // A new problem resets the language and anything typed, during render.
   if (problem && problem.slug !== syncedSlug) {
      setSyncedSlug(problem.slug);
      setLanguage(problem.supportedLanguages[0] || "");
      setDrafts({});
   }

   const starter = problem?.starterCode?.[language] || "";
   const code = drafts[language] ?? starter;
   const dirty = code !== starter;

   const onReset = () => {
      const next = { ...drafts };

      delete next[language];
      setDrafts(next);
      setResetConfirm(false);
   };

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

   const renderGate = () =>
      !solves && (
         <div className="problem-gate">
            {user ? (
               "Setters and admins do not run or submit code, so the editor is read only."
            ) : (
               <span>
                  Running code needs an account.{" "}
                  <Link to="/login">Sign in</Link> or{" "}
                  <Link to="/register">register</Link> - it is free and takes a
                  minute.
               </span>
            )}
         </div>
      );

   const renderEditor = () => (
      <CodeEditor
         languages={problem.supportedLanguages}
         language={language}
         code={code}
         dirty={dirty}
         readOnly={!solves}
         onPickLanguage={setLanguage}
         onChange={(value) => setDrafts({ ...drafts, [language]: value })}
         onReset={() => setResetConfirm(true)}
      />
   );

   const renderResult = () => (
      <div className="problem-result">
         <ResultPanel
            sampleCount={problem.sampleTestCases.length}
            testCount={problem.testCaseCount}
            solves={solves}
            signedIn={Boolean(user)}
         />
      </div>
   );

   const renderCodeColumn = () => (
      <section className="problem-code">
         {renderGate()}
         {renderEditor()}
         <div className="problem-result-resize" style={{ height: resultH }}>
            <div
               className="problem-grab-row"
               role="separator"
               aria-label="Resize result panel"
               aria-orientation="horizontal"
               aria-valuemin={RESULT.min}
               aria-valuemax={RESULT.max}
               aria-valuenow={resultH}
               tabIndex={0}
               onKeyDown={(event) => {
                  if (event.key === "ArrowUp")
                     setResultH((height) => Math.min(RESULT.max, height + 10));
                  if (event.key === "ArrowDown")
                     setResultH((height) => Math.max(RESULT.min, height - 10));
               }}
               onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  event.currentTarget.dataset.startY = event.clientY;
                  event.currentTarget.dataset.startHeight = resultH;
               }}
               onPointerMove={(event) => {
                  if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                     return;
                  }
                  const startY = Number(event.currentTarget.dataset.startY);
                  const startHeight = Number(
                     event.currentTarget.dataset.startHeight,
                  );
                  const next = Math.min(
                     RESULT.max,
                     Math.max(
                        RESULT.min,
                        startHeight - (event.clientY - startY),
                     ),
                  );
                  setResultH(next);
               }}
            >
               <span className="problem-grip" />
            </div>
            {renderResult()}
         </div>
      </section>
   );

   // One tab, one pane: code is the editor, result is the result.
   const renderTabPane = () => {
      if (mtab === "problem") return renderQuestion();

      return (
         <section className="problem-code">
            {renderGate()}
            {mtab === "code" ? renderEditor() : renderResult()}
         </section>
      );
   };

   const renderTabs = () => (
      <div className="problem-tabs">
         {mobileTabs.map((tab) => (
            <button
               key={tab.value}
               type="button"
               className={
                  tab.value === mtab
                     ? "problem-tab problem-tab-on"
                     : "problem-tab"
               }
               onClick={() => setMtab(tab.value)}
            >
               {tab.label}
            </button>
         ))}
      </div>
   );

   const renderResetConfirm = () => (
      <div className="dialog-backdrop">
         <div className="dialog">
            <div className="dialog-title">Reset to starter code?</div>

            <div className="dialog-body">
               Everything you wrote in {LANG_LABEL[language] || language} for
               this problem is thrown away. There is no undo.
            </div>

            <div className="dialog-actions">
               <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setResetConfirm(false)}
               >
                  Keep my code
               </button>

               <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onReset}
               >
                  Reset
               </button>
            </div>
         </div>
      </div>
   );

   // Wide shows both columns. Narrow shows whichever tab is picked.
   const renderSplit = () => {
      if (view.narrow) {
         return (
            <>
               <div className="problem-shell" style={{ height: view.height }}>
                  {renderTabs()}

                  <div className="problem-pane">{renderTabPane()}</div>
               </div>

               {resetConfirm && renderResetConfirm()}
            </>
         );
      }

      return (
         <>
            <div
               className="problem-shell problem-split"
               style={{ height: view.height, "--problem-split": `${split}%` }}
            >
               {renderQuestion()}
               {renderCodeColumn()}
               <div
                  className="problem-grab-col"
                  role="separator"
                  aria-label="Resize question and code panels"
                  aria-orientation="vertical"
                  aria-valuemin={SPLIT.min}
                  aria-valuemax={SPLIT.max}
                  aria-valuenow={split}
                  tabIndex={0}
                  onKeyDown={(event) => {
                     if (event.key === "ArrowLeft")
                        setSplit((value) => Math.max(SPLIT.min, value - 2));
                     if (event.key === "ArrowRight")
                        setSplit((value) => Math.min(SPLIT.max, value + 2));
                  }}
                  onPointerDown={(event) => {
                     event.currentTarget.setPointerCapture(event.pointerId);
                     event.currentTarget.dataset.startX = event.clientX;
                     event.currentTarget.dataset.startSplit = split;
                     event.currentTarget.dataset.width =
                        event.currentTarget.parentElement.getBoundingClientRect().width;
                  }}
                  onPointerMove={(event) => {
                     if (
                        !event.currentTarget.hasPointerCapture(event.pointerId)
                     )
                        return;
                     const dx =
                        event.clientX -
                        Number(event.currentTarget.dataset.startX);
                     const width = Number(event.currentTarget.dataset.width);
                     const start = Number(
                        event.currentTarget.dataset.startSplit,
                     );
                     setSplit(
                        Math.min(
                           SPLIT.max,
                           Math.max(SPLIT.min, start + (dx / width) * 100),
                        ),
                     );
                  }}
               >
                  <span className="problem-grip" />
               </div>
            </div>

            {resetConfirm && renderResetConfirm()}
         </>
      );
   };

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
         return renderSplit();
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
