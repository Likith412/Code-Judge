import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
   getContest,
   createContest,
   updateContest,
} from "../../services/api/contests";
import { listProblems } from "../../services/api/problems";
import { apiError, fieldErrors } from "../../services/api/client";
import Field from "../../components/Field";
import SaveNotice from "../../components/SaveNotice";
import FailureView from "../../components/FailureView";
import ProblemPager from "../../components/ProblemPager";
import DifficultyTag from "../../components/DifficultyTag";

import "./index.css";

const EMPTY = {
   title: "",
   slug: "",
   description: "",
   startTime: "",
   endTime: "",
   penaltyPerWrongMin: 10,
   problems: [],
};

const apiStatusConstants = {
   initial: "INITIAL",
   success: "SUCCESS",
   failure: "FAILURE",
   inProgress: "IN_PROGRESS",
};

// datetime-local expects the device's wall time, while the API stores UTC.
const localTime = (iso) => {
   const date = new Date(iso);

   return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
};

const ContestEditorPage = () => {
   const { slug } = useParams();
   const navigate = useNavigate();
   const [draft, setDraft] = useState(EMPTY);
   const [saved, setSaved] = useState(null);
   const [apiStatus, setApiStatus] = useState(apiStatusConstants.initial);
   const [failure, setFailure] = useState("");
   const [reloadCount, setReloadCount] = useState(0);
   const [busy, setBusy] = useState(false);
   const [message, setMessage] = useState(null);
   const [errors, setErrors] = useState({});
   const [publishing, setPublishing] = useState(false);
   const [choices, setChoices] = useState(null);
   const [choiceError, setChoiceError] = useState("");
   const [choicePage, setChoicePage] = useState(1);
   const [search, setSearch] = useState("");
   const [choiceReload, setChoiceReload] = useState(0);

   useEffect(() => {
      let cancelled = false;
      const load = async () => {
         setApiStatus(apiStatusConstants.inProgress);

         try {
            const data = slug ? await getContest(slug) : null;

            if (cancelled) return;

            const contest = data?.contest;
            setSaved(contest || null);
            setDraft(
               contest
                  ? {
                       ...contest,
                       startTime: localTime(contest.startTime),
                       endTime: localTime(contest.endTime),
                       problems: contest.problems.map((problem) => ({
                          problemId: problem.problemId,
                          title: problem.title,
                          points: problem.points,
                       })),
                    }
                  : EMPTY,
            );
            setApiStatus(apiStatusConstants.success);
         } catch (error) {
            if (cancelled) return;
            setFailure(apiError(error).message);
            setApiStatus(apiStatusConstants.failure);
         }
      };
      load();

      return () => {
         cancelled = true;
      };
   }, [slug, reloadCount]);

   useEffect(() => {
      let cancelled = false;
      const load = async () => {
         try {
            const data = await listProblems({
               status: "DRAFT",
               page: choicePage,
               q: search,
               limit: 20,
            });

            if (!cancelled) {
               setChoices(data);
               setChoiceError("");
            }
         } catch (error) {
            if (!cancelled) setChoiceError(apiError(error).message);
         }
      };
      load();

      return () => {
         cancelled = true;
      };
   }, [choicePage, search, choiceReload]);

   const set = (key) => (event) =>
      setDraft((current) => ({ ...current, [key]: event.target.value }));

   const save = async (isPublished) => {
      setBusy(true);
      setErrors({});
      setMessage(null);
      setPublishing(false);

      try {
         const start = new Date(draft.startTime);
         const end = new Date(draft.endTime);

         if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
            throw new Error("Choose start and end times");

         const body = {
            title: draft.title,
            slug: draft.slug,
            description: draft.description,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            penaltyPerWrongMin: Number(draft.penaltyPerWrongMin),
            isPublished,
            problems: draft.problems.map((problem) => ({
               problemId: problem.problemId,
               points: Number(problem.points),
            })),
         };

         const data = saved
            ? await updateContest(saved.id, body)
            : await createContest(body);
         navigate(`/contests/${data.contest.slug}`, { replace: true });
      } catch (error) {
         setErrors(fieldErrors(error));
         setMessage({
            tone: "error",
            text: error.response ? apiError(error).message : error.message,
         });
      } finally {
         setBusy(false);
      }
   };

   const renderEditor = () => {
      if (saved?.isPublished)
         return (
            <main className="cj-main">
               <h1 className="cj-page-title">Contest published</h1>
               <p>Its schedule, problems and scoring are fixed.</p>
               <Link to={`/contests/${saved.slug}`}>Open contest</Link>
            </main>
         );

      return (
         <main className="cj-main">
            <h1 className="cj-page-title">
               {saved ? "Edit contest" : "New contest"}
            </h1>
            <p className="cj-muted">
               Create draft problems and their test cases in Setter first.
               Contest questions remain private. Published contests and their
               questions are fixed.
            </p>

            <SaveNotice message={message} errors={errors} />
            <div className="contest-editor-grid">
               <div className="contest-editor-fields">
                  <Field
                     label="Title"
                     name="title"
                     value={draft.title}
                     onChange={set("title")}
                     error={errors.title}
                  />

                  <Field
                     label="Slug"
                     name="slug"
                     value={draft.slug}
                     onChange={set("slug")}
                     error={errors.slug}
                     hint="Lowercase letters, numbers and single dashes."
                  />

                  <Field
                     label="Description · Markdown"
                     name="description"
                     multiline
                     value={draft.description}
                     onChange={set("description")}
                     error={errors.description}
                  />

                  <Field
                     label="Start · local time"
                     name="startTime"
                     type="datetime-local"
                     value={draft.startTime}
                     onChange={set("startTime")}
                     error={errors.startTime}
                  />

                  <Field
                     label="End · local time"
                     name="endTime"
                     type="datetime-local"
                     value={draft.endTime}
                     onChange={set("endTime")}
                     error={errors.endTime}
                  />

                  <Field
                     label="Penalty per wrong submission · minutes"
                     name="penaltyPerWrongMin"
                     type="number"
                     min="0"
                     max="120"
                     value={draft.penaltyPerWrongMin}
                     onChange={set("penaltyPerWrongMin")}
                     error={errors.penaltyPerWrongMin}
                  />
               </div>

               <section className="contest-editor-side">
                  {/* What is in the contest, lettered in the order it was added. */}
                  <div className="contest-editor-panel-head">
                     <span className="contest-editor-panel-title">
                        Contest problems
                     </span>

                     <span className="cj-muted">
                        {draft.problems.length} of 26 · in contest order
                     </span>
                  </div>

                  {draft.problems.length === 0 && (
                     <p className="contest-editor-empty">
                        No problems yet. Add them from the list below.
                     </p>
                  )}

                  {draft.problems.map((problem, index) => (
                     <div
                        className="contest-editor-problem"
                        key={problem.problemId}
                     >
                        <span className="contest-editor-letter">
                           {String.fromCharCode(65 + index)}
                        </span>

                        <span className="contest-editor-title">
                           {problem.title}
                        </span>

                        <label className="contest-editor-points">
                           <input
                              className="input"
                              type="number"
                              min="1"
                              max="10000"
                              aria-label={`Points for ${problem.title}`}
                              value={problem.points}
                              onChange={(event) =>
                                 setDraft((current) => ({
                                    ...current,
                                    problems: current.problems.map((row) =>
                                       row.problemId === problem.problemId
                                          ? {
                                               ...row,
                                               points: event.target.value,
                                            }
                                          : row,
                                    ),
                                 }))
                              }
                           />

                           <span className="cj-muted">pts</span>
                        </label>

                        <button
                           type="button"
                           className="btn btn-ghost"
                           onClick={() =>
                              setDraft((current) => ({
                                 ...current,
                                 problems: current.problems.filter(
                                    (row) =>
                                       row.problemId !== problem.problemId,
                                 ),
                              }))
                           }
                        >
                           Remove
                        </button>
                     </div>
                  ))}

                  {/* Only drafts can join a contest, so only drafts are listed. */}
                  <div className="contest-editor-panel-head contest-editor-library-head">
                     <span className="contest-editor-panel-title">
                        Add problems
                     </span>

                     <span className="cj-muted">Draft problems only</span>
                  </div>

                  <form
                     className="contest-editor-search"
                     onSubmit={(event) => {
                        event.preventDefault();
                        setSearch(
                           new FormData(event.currentTarget)
                              .get("search")
                              .trim(),
                        );
                        setChoicePage(1);
                     }}
                  >
                     <input
                        className="input"
                        name="search"
                        placeholder="Search by title"
                        aria-label="Search draft problems"
                     />

                     <button className="btn btn-secondary">Search</button>
                  </form>

                  {choiceError && (
                     <p className="contest-editor-empty">
                        {choiceError}{" "}
                        <button
                           type="button"
                           className="btn btn-secondary"
                           onClick={() => setChoiceReload((count) => count + 1)}
                        >
                           Try again
                        </button>
                     </p>
                  )}

                  {choices?.problems.map((problem) => {
                     const added = draft.problems.some(
                        (row) => row.problemId === problem.id,
                     );

                     return (
                        <div className="contest-editor-choice" key={problem.id}>
                           <Link
                              className="contest-editor-title"
                              to={`/setter/problems/${problem.slug}/edit`}
                           >
                              {problem.title}
                           </Link>

                           <DifficultyTag difficulty={problem.difficulty} />
                           <button
                              type="button"
                              className={
                                 added
                                    ? "btn btn-ghost contest-editor-added"
                                    : "btn btn-secondary"
                              }
                              disabled={added || draft.problems.length >= 26}
                              onClick={() =>
                                 setDraft((current) => ({
                                    ...current,
                                    problems: [
                                       ...current.problems,
                                       {
                                          problemId: problem.id,
                                          title: problem.title,
                                          points: 100,
                                       },
                                    ],
                                 }))
                              }
                           >
                              {added ? "Added" : "Add"}
                           </button>
                        </div>
                     );
                  })}
                  {choices?.total === 0 && (
                     <p className="contest-editor-empty">
                        No draft problems match.
                     </p>
                  )}

                  {choices?.total > 0 && (
                     <ProblemPager {...choices} onGo={setChoicePage} />
                  )}
               </section>
            </div>

            <div className="contest-editor-actions">
               <button
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => save(false)}
               >
                  Save draft
               </button>

               <button
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => setPublishing(true)}
               >
                  Publish contest
               </button>

               <Link to="/contests">Cancel</Link>
            </div>

            {publishing && (
               <div className="dialog-backdrop">
                  <div
                     className="dialog"
                     role="dialog"
                     aria-modal="true"
                     aria-labelledby="publish-contest"
                  >
                     <div className="dialog-title" id="publish-contest">
                        Publish this contest?
                     </div>

                     <p>
                        Its schedule, questions, points and penalties become
                        fixed. Every question must have a sample and at least
                        one test case.
                     </p>

                     <div className="dialog-actions">
                        <button
                           className="btn btn-secondary"
                           onClick={() => setPublishing(false)}
                        >
                           Keep editing
                        </button>

                        <button
                           className="btn btn-primary"
                           onClick={() => save(true)}
                        >
                           Publish
                        </button>
                     </div>
                  </div>
               </div>
            )}
         </main>
      );
   };

   switch (apiStatus) {
      case apiStatusConstants.success:
         return renderEditor();
      case apiStatusConstants.failure:
         return (
            <FailureView
               message={failure}
               onRetry={() => setReloadCount((count) => count + 1)}
            />
         );
      case apiStatusConstants.inProgress:
         return (
            <main className="cj-main">
               <p className="cj-muted">Loading contest editor…</p>
            </main>
         );
      default:
         return null;
   }
};

export default ContestEditorPage;
