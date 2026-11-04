import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { listMySubmissions } from "../../services/api/submissions";
import { apiError } from "../../services/api/client";
import ProblemPager from "../../components/ProblemPager";
import VerdictTag from "../../components/VerdictTag";
import { formatWhen } from "../../utils/date";
import { LANG_LABEL } from "../../utils/languages";
import { STATUS_LABEL } from "../../utils/verdicts";

import "./index.css";

const apiStatusConstants = {
   initial: "INITIAL",
   success: "SUCCESS",
   failure: "FAILURE",
   inProgress: "IN_PROGRESS",
};

const PAGE_SIZE = 20;

const languageFilters = [
   { value: "", label: "All languages" },
   ...Object.entries(LANG_LABEL).map(([value, label]) => ({ value, label })),
];

const VERDICTS = [
   "ACCEPTED",
   "WRONG_ANSWER",
   "TIME_LIMIT_EXCEEDED",
   "MEMORY_LIMIT_EXCEEDED",
   "COMPILATION_ERROR",
   "RUNTIME_ERROR",
   "SYSTEM_ERROR",
];

const verdictFilters = [
   { value: "", label: "All verdicts" },
   ...VERDICTS.map((value) => ({ value, label: STATUS_LABEL[value] })),
];

// A label, then one small button per choice. One is always on.
const ChipRow = ({ label, options, value, onPick }) => (
   <div className="subs-filter">
      <span className="subs-filter-label">{label}</span>

      {options.map((option) => (
         <button
            key={option.value}
            type="button"
            className={
               option.value === value ? "subs-chip subs-chip-on" : "subs-chip"
            }
            onClick={() => onPick(option.value)}
         >
            {option.label}
         </button>
      ))}
   </div>
);

const SubmissionsPage = () => {
   const [searchParams, setSearchParams] = useSearchParams();

   const page = Number(searchParams.get("page")) || 1;
   const problemId = searchParams.get("problem") || "";
   const contestId = searchParams.get("contest") || "";
   const language = searchParams.get("language") || "";
   const status = searchParams.get("status") || "";

   const [result, setResult] = useState(null);
   const [apiStatus, setApiStatus] = useState(apiStatusConstants.initial);
   const [failure, setFailure] = useState("");
   const [reloadCount, setReloadCount] = useState(0);

   // The url holds the filters, so back, forward and a shared link all work.
   useEffect(() => {
      let cancelled = false;

      const load = async () => {
         setApiStatus(apiStatusConstants.inProgress);

         try {
            const data = await listMySubmissions({
               page,
               problemId,
               contestId,
               language,
               status,
               limit: PAGE_SIZE,
            });

            if (cancelled) return;

            setResult(data);
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
   }, [page, problemId, contestId, language, status, reloadCount]);

   // Back to page one unless the change names a page. Empty values stay off the url.
   const setParams = (changes) => {
      const next = {
         problem: problemId,
         contest: contestId,
         language,
         status,
         page: 1,
         ...changes,
      };

      setSearchParams(
         Object.fromEntries(
            Object.entries(next).filter(
               ([key, value]) =>
                  value !== "" && !(key === "page" && Number(value) === 1),
            ),
         ),
      );
   };

   const filtered = Boolean(problemId || contestId || language || status);

   // Only the contests you took part in, so the row is absent for most people.
   const contestFilters = [
      { value: "", label: "All" },
      ...(result?.contests || []).map((contest) => ({
         value: String(contest.id),
         label: contest.title,
      })),
   ];

   const problemFilters = [
      { value: "", label: "All problems" },
      ...(result?.problems || []).map((problem) => ({
         value: String(problem.id),
         label: problem.title,
      })),
   ];

   const countText = () => {
      if (!result) return "Loading…";

      const word = result.total === 1 ? "submission" : "submissions";

      return filtered
         ? `${result.total} ${word} match`
         : `${result.total} ${word}`;
   };

   const renderEmpty = () => (
      <div className="subs-empty">
         <div className="subs-empty-title">
            {filtered ? "Nothing matches those filters" : "No submissions yet"}
         </div>

         <p className="subs-empty-body">
            {filtered
               ? "Try a different problem, language or verdict."
               : "Every Submit you make lands here. Run doesn’t."}
         </p>

         {filtered ? (
            <button
               type="button"
               className="btn btn-secondary"
               onClick={() => setSearchParams({})}
            >
               Clear filters
            </button>
         ) : (
            <Link className="btn btn-primary" to="/problems">
               Pick a problem
            </Link>
         )}
      </div>
   );

   const renderRow = (row) => (
      <Link className="subs-row" key={row.id} to={`/submissions/${row.id}`}>
         <span className="subs-when">{formatWhen(row.createdAt)}</span>
         <span className="subs-title">
            {row.problem?.title || "Deleted problem"}
         </span>

         <span>{LANG_LABEL[row.language] || row.language}</span>
         <span>
            <VerdictTag status={row.status} />
         </span>
      </Link>
   );

   const renderList = () => {
      if (result.submissions.length === 0) return renderEmpty();

      return (
         <>
            <div className="subs-head">
               <span>When</span>
               <span>Problem</span>
               <span>Language</span>
               <span>Verdict</span>
            </div>

            {result.submissions.map(renderRow)}

            <ProblemPager
               page={result.page}
               limit={result.limit}
               total={result.total}
               totalPages={result.totalPages}
               onGo={(number) => setParams({ page: number })}
            />
         </>
      );
   };

   const renderFailure = () => (
      <div className="subs-empty">
         <div className="subs-empty-title">Could not load submissions</div>

         <p className="subs-empty-body">{failure}</p>

         <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setReloadCount((count) => count + 1)}
         >
            Try again
         </button>
      </div>
   );

   const renderBody = () => {
      switch (apiStatus) {
         case apiStatusConstants.success:
            return renderList();
         case apiStatusConstants.failure:
            return renderFailure();
         case apiStatusConstants.inProgress:
            return <p className="subs-loading">Loading submissions…</p>;
         default:
            return null;
      }
   };

   return (
      <main className="cj-main">
         <header className="subs-header">
            <h1 className="subs-title-main">Submissions</h1>
            <div className="subs-count">{countText()}</div>
         </header>

         <div className="subs-filters">
            <ChipRow
               label="Problem"
               options={problemFilters}
               value={problemId}
               onPick={(value) => setParams({ problem: value })}
            />

            {contestFilters.length > 1 && (
               <ChipRow
                  label="Contest"
                  options={contestFilters}
                  value={contestId}
                  onPick={(value) => setParams({ contest: value })}
               />
            )}

            <ChipRow
               label="Language"
               options={languageFilters}
               value={language}
               onPick={(value) => setParams({ language: value })}
            />

            <ChipRow
               label="Verdict"
               options={verdictFilters}
               value={status}
               onPick={(value) => setParams({ status: value })}
            />
         </div>

         {renderBody()}
      </main>
   );
};

export default SubmissionsPage;
