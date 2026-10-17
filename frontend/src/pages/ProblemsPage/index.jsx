import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { listProblems, listTags } from "../../services/api/problems";
import { apiError } from "../../services/api/client";
import UserContext from "../../context/UserContext";
import ProblemFilters from "../../components/ProblemFilters";
import ProblemList from "../../components/ProblemList";
import ProblemPager from "../../components/ProblemPager";

import "./index.css";

const apiStatusConstants = {
   initial: "INITIAL",
   success: "SUCCESS",
   failure: "FAILURE",
   inProgress: "IN_PROGRESS",
};

const PAGE_SIZE = 20;

const sortFilters = [
   { value: "NEWEST", label: "Newest" },
   { value: "OLDEST", label: "Oldest" },
   { value: "TITLE", label: "Title" },
   { value: "DIFFICULTY", label: "Difficulty" },
];

// Each of these changes which tags exist, so the picked tag is dropped.
const CLEARS_TAG = ["difficulty", "progress", "status", "mine"];

const ProblemsPage = () => {
   const [searchParams, setSearchParams] = useSearchParams();

   const page = Number(searchParams.get("page")) || 1;
   const q = searchParams.get("q") || "";
   const difficulty = searchParams.get("difficulty") || "";
   const sort = searchParams.get("sort") || "NEWEST";
   const tags = (searchParams.get("tags") || "").split(",").filter(Boolean);
   const progress = searchParams.get("progress") || "";
   const status = searchParams.get("status") || "PUBLISHED";
   const mine = searchParams.get("mine") || "";

   const { user } = useContext(UserContext);
   const canSeeDrafts = user?.role === "SETTER" || user?.role === "ADMIN";

   // A setter writes problems rather than solving them, so no progress filter.
   const solves = user?.role === "USER";

   // A fresh array each render, so the fetch and its deps use the text instead.
   const tagKey = tags.join(",");

   const [result, setResult] = useState(null);
   const [apiStatus, setApiStatus] = useState(apiStatusConstants.initial);
   const [problem, setProblem] = useState(null);
   const [searchText, setSearchText] = useState(q);
   const [syncedQ, setSyncedQ] = useState(q);
   const [knownTags, setKnownTags] = useState([]);
   const [reloadCount, setReloadCount] = useState(0);

   // Phones only: the filters fold away so the list comes first.
   const [showFilters, setShowFilters] = useState(false);

   // The url is the only place filters live, so back and forward both work.
   useEffect(() => {
      let cancelled = false;

      const load = async () => {
         setApiStatus(apiStatusConstants.inProgress);

         try {
            const data = await listProblems({
               page,
               q,
               difficulty,
               sort,
               tags: tagKey,
               progress,
               status,
               mine,
               limit: PAGE_SIZE,
            });

            if (cancelled) return;

            setResult(data);
            setApiStatus(apiStatusConstants.success);
         } catch (error) {
            if (cancelled) return;

            setProblem(apiError(error).message);
            setApiStatus(apiStatusConstants.failure);
         }
      };

      load();

      return () => {
         cancelled = true;
      };
   }, [page, q, difficulty, sort, tagKey, progress, status, mine, reloadCount]);

   // The whole tag list with counts. Only the visibility filters change it.
   useEffect(() => {
      let cancelled = false;

      const load = async () => {
         try {
            const data = await listTags({ status, mine, difficulty });

            if (!cancelled) setKnownTags(data.tags);
         } catch {
            if (!cancelled) setKnownTags([]);
         }
      };

      load();

      return () => {
         cancelled = true;
      };
   }, [status, mine, difficulty, reloadCount]);

   // Follows the url when it moves on its own. Adjusted in render, not an effect.
   if (q !== syncedQ) {
      setSyncedQ(q);
      setSearchText(q);
   }

   // Back to page one unless the change names a page, or you land past the end.
   const setParams = (changes) => {
      const next = {
         q,
         difficulty,
         sort,
         tags,
         progress,
         status,
         mine,
         page: 1,
         ...changes,
      };

      if (Object.keys(changes).some((key) => CLEARS_TAG.includes(key))) {
         next.tags = [];
      }

      setSearchParams(
         // Defaults are left out, so a plain list has a plain url.
         Object.fromEntries(
            Object.entries(next)
               .map(([key, value]) => [
                  key,
                  Array.isArray(value) ? value.join(",") : value,
               ])
               .filter(
                  ([key, value]) =>
                     value !== "" &&
                     !(key === "page" && Number(value) === 1) &&
                     !(key === "sort" && value === "NEWEST") &&
                     !(key === "status" && value === "PUBLISHED"),
               ),
         ),
      );
   };

   // Add or drop one, keeping the rest.
   const onToggleTag = (value) =>
      setParams({
         tags: tags.includes(value)
            ? tags.filter((one) => one !== value)
            : [...tags, value],
      });

   const onSubmitSearch = (event) => {
      event.preventDefault();
      setParams({ q: searchText.trim() });
   };

   const filtered = Boolean(
      q ||
      difficulty ||
      tags.length ||
      progress ||
      mine ||
      status !== "PUBLISHED",
   );

   const activeFilters =
      (difficulty ? 1 : 0) +
      (progress ? 1 : 0) +
      (mine ? 1 : 0) +
      (status !== "PUBLISHED" ? 1 : 0) +
      tags.length;

   const countText = () => {
      if (!result) return "Loading…";

      const word = result.total === 1 ? "problem" : "problems";

      return filtered
         ? `${result.total} ${word} match`
         : `${result.total} ${word}`;
   };

   const renderEmpty = () => (
      <div className="problems-empty">
         <div className="problems-empty-title">No problems match</div>

         <div className="problems-empty-reason">
            {filtered
               ? "Nothing here fits those filters."
               : "No problems have been published yet."}
         </div>

         {filtered && (
            <button
               type="button"
               className="btn btn-secondary"
               onClick={() => setSearchParams({})}
            >
               Clear filters
            </button>
         )}
      </div>
   );

   const renderFailure = () => (
      <div className="problems-empty">
         <div className="problems-empty-title">Could not load problems</div>

         <div className="problems-empty-reason">{problem}</div>

         <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setReloadCount((count) => count + 1)}
         >
            Try again
         </button>
      </div>
   );

   const renderList = () => {
      if (result.problems.length === 0) return renderEmpty();

      return (
         <>
            <ProblemList problems={result.problems} />

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

   const renderBody = () => {
      switch (apiStatus) {
         case apiStatusConstants.success:
            return renderList();
         case apiStatusConstants.failure:
            return renderFailure();
         case apiStatusConstants.inProgress:
            return <p className="problems-loading">Loading problems…</p>;
         default:
            return null;
      }
   };

   return (
      <main className="cj-main">
         <header className="problems-header">
            <div className="problems-heading">
               <h1 className="problems-title">Problems</h1>
               <div className="problems-count">{countText()}</div>
            </div>

            <form className="problems-tools" onSubmit={onSubmitSearch}>
               <input
                  className="input problems-search"
                  type="search"
                  placeholder="Search by title"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
               />

               <select
                  className="input problems-sort"
                  value={sort}
                  onChange={(event) => setParams({ sort: event.target.value })}
               >
                  {sortFilters.map((option) => (
                     <option key={option.value} value={option.value}>
                        {option.label}
                     </option>
                  ))}
               </select>
            </form>
         </header>

         {/* Hidden on wider screens, where the filters always show. */}
         <div className="problems-filter-bar">
            <button
               type="button"
               className="btn btn-secondary problems-filter-toggle"
               onClick={() => setShowFilters((open) => !open)}
               aria-expanded={showFilters}
            >
               {showFilters ? "Hide filters" : "Filters"}
               {activeFilters > 0 && ` · ${activeFilters}`}
            </button>

            {activeFilters > 0 && (
               <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setSearchParams(q ? { q } : {})}
               >
                  Clear
               </button>
            )}
         </div>

         <div className="problems-layout">
            <div
               className={
                  showFilters
                     ? "problems-rail-wrap problems-rail-open"
                     : "problems-rail-wrap"
               }
            >
               <ProblemFilters
                  difficulty={difficulty}
                  progress={progress}
                  status={status}
                  mine={mine}
                  tags={tags}
                  tagCounts={knownTags}
                  solves={solves}
                  canSeeDrafts={canSeeDrafts}
                  onPick={setParams}
                  onToggleTag={onToggleTag}
               />
            </div>

            <section className="problems-list">{renderBody()}</section>
         </div>
      </main>
   );
};

export default ProblemsPage;
