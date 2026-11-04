import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
   addTestCase,
   deleteTestCase,
   getProblemForEdit,
   listTestCases,
   updateTestCase,
} from "../../services/api/problems";
import { apiError } from "../../services/api/client";
import FailureView from "../../components/FailureView";
import SetterTabs from "../../components/SetterTabs";

import "./index.css";

const apiStatusConstants = {
   initial: "INITIAL",
   success: "SUCCESS",
   failure: "FAILURE",
   inProgress: "IN_PROGRESS",
};

const FIELDS = ["input", "expectedOutput", "isHidden", "explanation", "weight"];

let nextKey = 0;

// A row as the form holds it. saved is the server's copy, null when new.
const fromServer = (testCase) => {
   const fields = {
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      isHidden: testCase.isHidden,
      explanation: testCase.explanation || "",
      weight: testCase.weight,
   };

   return { key: testCase.id, id: testCase.id, ...fields, saved: fields };
};

const newRow = () => ({
   key: `new-${(nextKey += 1)}`,
   id: null,
   input: "",
   expectedOutput: "",
   // Hidden unless you say otherwise, the same as the server.
   isHidden: true,
   explanation: "",
   weight: 1,
   saved: null,
});

// A hidden case has no explanation to change.
const changedFields = (row) =>
   FIELDS.filter(
      (key) =>
         !(key === "explanation" && row.isHidden) &&
         (!row.saved || String(row[key]) !== String(row.saved[key])),
   );

const TestCasesPage = () => {
   const { slug } = useParams();

   const [problem, setProblem] = useState(null);
   const [rows, setRows] = useState([]);
   const [apiStatus, setApiStatus] = useState(apiStatusConstants.initial);
   const [failure, setFailure] = useState(null);
   const [reloadCount, setReloadCount] = useState(0);
   const [confirmRow, setConfirmRow] = useState(null);

   // Whose rows are shown, so a rename keeps them.
   const loadedId = useRef(null);

   useEffect(() => {
      let cancelled = false;

      const load = async () => {
         if (!loadedId.current) setApiStatus(apiStatusConstants.inProgress);

         try {
            // The slug finds the problem. Its id is what the case routes take.
            const problemData = await getProblemForEdit(slug);
            const found = problemData.problem;

            // Same problem, new slug: keep the rows.
            if (found.id === loadedId.current) {
               if (!cancelled) setProblem(found);

               return;
            }

            const caseData = await listTestCases(found.id);

            if (cancelled) return;

            loadedId.current = found.id;
            setProblem(found);
            setRows(caseData.testCases.map(fromServer));
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

   const patchRow = (key, changes) =>
      setRows((current) =>
         current.map((row) => (row.key === key ? { ...row, ...changes } : row)),
      );

   const bodyFor = (row, keys) => {
      const body = {};

      for (const key of keys) {
         body[key] = key === "weight" ? Number(row.weight) : row[key];
      }

      // Only a sample shows an explanation, so a hidden one sends none.
      if (row.isHidden) delete body.explanation;

      return body;
   };

   const saveRow = async (row) => {
      // What was sent, so text typed meanwhile is kept.
      const sent = Object.fromEntries(FIELDS.map((key) => [key, row[key]]));

      patchRow(row.key, { busy: true, error: "" });

      try {
         const data = row.id
            ? await updateTestCase(
                 problem.id,
                 row.id,
                 bodyFor(row, changedFields(row)),
              )
            : await addTestCase(problem.id, bodyFor(row, FIELDS));

         const server = fromServer(data.testCase);

         setRows((current) =>
            current.map((one) => {
               if (one.key !== row.key) return one;

               const next = { ...one, id: server.id, saved: server.saved };

               // The server's value, unless it was edited since.
               for (const key of FIELDS) {
                  next[key] = one[key] === sent[key] ? server[key] : one[key];
               }

               return { ...next, busy: false };
            }),
         );
      } catch (error) {
         patchRow(row.key, { busy: false, error: apiError(error).message });
      }
   };

   // A saved case changes at once. A new one waits for its Save.
   const setHidden = async (row, isHidden) => {
      if (isHidden === row.isHidden) return;

      patchRow(row.key, { isHidden, error: "" });

      if (!row.id) return;

      try {
         const data = await updateTestCase(problem.id, row.id, { isHidden });

         patchRow(row.key, {
            saved: fromServer(data.testCase).saved,
            isHidden: data.testCase.isHidden,
         });
      } catch (error) {
         patchRow(row.key, {
            isHidden: row.isHidden,
            error: apiError(error).message,
         });
      }
   };

   const removeRow = async (row) => {
      setConfirmRow(null);

      if (!row.id) {
         setRows((current) => current.filter((one) => one.key !== row.key));

         return;
      }

      patchRow(row.key, { busy: true, error: "" });

      try {
         await deleteTestCase(problem.id, row.id);
         setRows((current) => current.filter((one) => one.key !== row.key));
      } catch (error) {
         patchRow(row.key, { busy: false, error: apiError(error).message });
      }
   };

   const renderRow = (row, index) => {
      const dirty = changedFields(row).length > 0;
      const field = (key) => (event) =>
         patchRow(row.key, { [key]: event.target.value });

      return (
         <div className="cases-row" key={row.key}>
            <span className="cases-num">{index + 1}</span>

            <select
               className={
                  row.isHidden
                     ? "input cases-vis cases-vis-hidden"
                     : "input cases-vis"
               }
               value={row.isHidden ? "hidden" : "sample"}
               onChange={(event) =>
                  setHidden(row, event.target.value === "hidden")
               }
               disabled={row.busy}
               title="Hidden cases are never shown to users"
            >
               <option value="sample">Sample</option>
               <option value="hidden">Hidden</option>
            </select>

            <textarea
               className="input cases-text"
               spellCheck={false}
               value={row.input}
               placeholder="Input (stdin)"
               onChange={field("input")}
            />

            <textarea
               className="input cases-text"
               spellCheck={false}
               value={row.expectedOutput}
               placeholder="Expected output"
               onChange={field("expectedOutput")}
            />

            <input
               className="input cases-weight"
               type="number"
               min="0"
               value={row.weight}
               onChange={field("weight")}
            />

            <button
               type="button"
               className="btn btn-icon btn-secondary"
               onClick={() => (row.id ? setConfirmRow(row) : removeRow(row))}
               disabled={row.busy}
               aria-label="Remove test case"
            >
               ×
            </button>

            {!row.isHidden && (
               <input
                  className="input cases-note"
                  value={row.explanation}
                  placeholder="Explanation shown with this sample (optional)"
                  onChange={field("explanation")}
               />
            )}

            {(dirty || row.error) && (
               <div className="cases-row-foot">
                  {row.error && (
                     <span className="cases-error">{row.error}</span>
                  )}

                  {dirty && (
                     <>
                        <span className="cases-unsaved">
                           {row.id ? "Unsaved changes" : "Not saved yet"}
                        </span>

                        <button
                           type="button"
                           className="btn btn-primary"
                           onClick={() => saveRow(row)}
                           disabled={row.busy}
                        >
                           {row.id ? "Save" : "Save case"}
                        </button>
                     </>
                  )}
               </div>
            )}
         </div>
      );
   };

   const renderConfirm = () => (
      <div className="dialog-backdrop">
         <div className="dialog" role="dialog">
            <div className="dialog-title">Delete this test case?</div>
            <div className="dialog-body">
               It is removed for good. Submissions already judged keep their
               verdicts.
            </div>

            <div className="dialog-actions">
               <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setConfirmRow(null)}
               >
                  Keep it
               </button>

               <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => removeRow(confirmRow)}
               >
                  Delete
               </button>
            </div>
         </div>
      </div>
   );

   const renderPage = () => {
      const hidden = rows.filter((row) => row.isHidden).length;
      const samples = rows.length - hidden;

      return (
         <main className="cj-main">
            <div className="cases-top">
               <SetterTabs slug={slug} active="cases" />

               <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setRows((current) => [...current, newRow()])}
               >
                  Add case
               </button>
            </div>

            <p className="cases-count-line">
               <strong>{rows.length}</strong>{" "}
               {rows.length === 1 ? "test case" : "test cases"} ·{" "}
               <strong>{samples}</strong> {samples === 1 ? "sample" : "samples"}{" "}
               · <strong>{hidden}</strong> hidden
            </p>

            <div className="cases-head">
               <span>#</span>
               <span>Visibility</span>
               <span>Input</span>
               <span>Expected output</span>
               <span>Weight</span>
               <span />
            </div>

            {rows.map(renderRow)}

            {rows.length === 0 && (
               <p className="cases-empty">
                  No test cases yet. Add one, and make at least one a sample so
                  the problem can be published.
               </p>
            )}

            {/* A footnote, so the cases themselves come first. */}
            <p className="cases-note-text">
               Cases run top to bottom. Judging stops at the first one that
               fails.
               {problem.isPublished &&
                  " Published, so it must keep at least one test case and one sample."}
            </p>

            {confirmRow && renderConfirm()}
         </main>
      );
   };

   const renderMissing = () => (
      <main className="cj-main-narrow">
         <h1 className="cj-screen-title">No such problem</h1>
         <p className="cj-prose">
            It does not exist, or it belongs to another setter.
         </p>

         <Link className="btn btn-primary" to="/setter/problems">
            Back to your problems
         </Link>
      </main>
   );

   switch (apiStatus) {
      case apiStatusConstants.success:
         return renderPage();
      case apiStatusConstants.failure:
         return [403, 404, 422].includes(failure.status) ? (
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
               <p className="cases-loading">Loading test cases…</p>
            </main>
         );
      default:
         return null;
   }
};

export default TestCasesPage;
