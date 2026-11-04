import { useContext, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { listContests } from "../../services/api/contests";
import { apiError } from "../../services/api/client";
import UserContext from "../../context/UserContext";
import FailureView from "../../components/FailureView";
import ProblemPager from "../../components/ProblemPager";
import ContestTimer from "../../components/ContestTimer";

import "./index.css";

const apiStatusConstants = {
   initial: "INITIAL",
   success: "SUCCESS",
   failure: "FAILURE",
   inProgress: "IN_PROGRESS",
};

const STATE_OPTIONS = [
   { value: "", label: "All contests" },
   { value: "LIVE", label: "Live" },
   { value: "UPCOMING", label: "Upcoming" },
   { value: "ENDED", label: "Ended" },
];

const ContestsPage = () => {
   const { user } = useContext(UserContext);
   const admin = user?.role === "ADMIN";

   // Only a USER joins contests, so only a USER can filter by them.
   const solver = user?.role === "USER";

   const [params, setParams] = useSearchParams();
   const page = Number(params.get("page")) || 1;
   const q = params.get("q") || "";
   const state = params.get("state") || "";
   const joined = params.get("joined") || "";
   const filtered = Boolean(q || state || joined);

   // What is typed and picked. It applies on Search, and follows the url.
   const [draft, setDraft] = useState({ q, state, joined });
   const [synced, setSynced] = useState(`${q}:${state}:${joined}`);

   if (`${q}:${state}:${joined}` !== synced) {
      setSynced(`${q}:${state}:${joined}`);
      setDraft({ q, state, joined });
   }

   const [result, setResult] = useState(null);
   const [apiStatus, setApiStatus] = useState(apiStatusConstants.initial);
   const [failure, setFailure] = useState("");
   const [reloadCount, setReloadCount] = useState(0);

   // Server time minus local time, for the row timers.
   const [offset, setOffset] = useState(0);

   useEffect(() => {
      let cancelled = false;

      const load = async () => {
         setApiStatus(apiStatusConstants.inProgress);

         try {
            const data = await listContests({ page, q, state, joined });

            if (cancelled) return;

            setResult(data);
            setOffset(new Date(data.serverTime).getTime() - Date.now());
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
   }, [page, q, state, joined, reloadCount, user?.role]);

   // Empty filters leave the url. A new search goes back to page one.
   const onSearch = (event) => {
      event.preventDefault();

      setParams(
         Object.fromEntries(
            Object.entries({ ...draft, q: draft.q.trim() }).filter(
               ([, value]) => value,
            ),
         ),
      );
   };

   const goToPage = (number) => {
      const next = new URLSearchParams(params);

      if (number > 1) next.set("page", String(number));
      else next.delete("page");

      setParams(next);
   };

   const renderRow = (contest) => (
      <Link
         className="contest-row"
         key={contest.id}
         to={`/contests/${contest.slug}`}
      >
         <div>
            <div className="contest-row-title">
               <strong>{contest.title}</strong>
               {contest.joined && (
                  <span className="contest-mine">
                     Joined · {contest.myScore} pts
                  </span>
               )}
            </div>

            <div className="contest-note">
               {new Date(contest.startTime).toLocaleString()} –{" "}
               {new Date(contest.endTime).toLocaleString()}
            </div>
         </div>

         <span>
            {contest.isPublished ? (
               <ContestTimer
                  startTime={contest.startTime}
                  endTime={contest.endTime}
                  offset={offset}
                  compact
               />
            ) : (
               "DRAFT"
            )}
         </span>

         <span>{contest.participantCount} joined</span>
      </Link>
   );

   const renderBody = () => {
      switch (apiStatus) {
         case apiStatusConstants.success:
            return (
               <>
                  {result.contests.length === 0 && (
                     <p className="contest-note contest-empty">
                        {joined && !q && !state
                           ? "You have not joined any contests yet."
                           : filtered
                             ? "No contests match."
                             : "No contests yet."}
                     </p>
                  )}

                  {result.contests.map(renderRow)}
                  {result.total > 0 && (
                     <ProblemPager {...result} onGo={goToPage} />
                  )}
               </>
            );
         case apiStatusConstants.failure:
            return (
               <FailureView
                  message={failure}
                  onRetry={() => setReloadCount((count) => count + 1)}
               />
            );
         case apiStatusConstants.inProgress:
            return <p className="contest-note">Loading contests…</p>;
         default:
            return null;
      }
   };

   // Drafts exist only for admins, so only they can filter by them.
   const stateOptions = admin
      ? [...STATE_OPTIONS, { value: "DRAFT", label: "Draft" }]
      : STATE_OPTIONS;

   return (
      <main className="cj-main">
         <div className="contest-heading">
            <h1 className="cj-page-title">Contests</h1>
            {admin && (
               <Link className="btn btn-primary" to="/admin/contests/new">
                  New contest
               </Link>
            )}
         </div>

         <form className="contest-tools" onSubmit={onSearch}>
            <input
               className="input contest-search"
               value={draft.q}
               onChange={(event) =>
                  setDraft({ ...draft, q: event.target.value })
               }
               placeholder="Search by title"
               aria-label="Search contests"
            />

            <select
               className="input contest-select"
               value={draft.state}
               onChange={(event) =>
                  setDraft({ ...draft, state: event.target.value })
               }
               aria-label="Filter by state"
            >
               {stateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                     {option.label}
                  </option>
               ))}
            </select>

            {solver && (
               <label className="contest-joined-filter">
                  <input
                     type="checkbox"
                     checked={draft.joined === "true"}
                     onChange={(event) =>
                        setDraft({
                           ...draft,
                           joined: event.target.checked ? "true" : "",
                        })
                     }
                  />
                  Only contests I joined
               </label>
            )}

            <button className="btn btn-secondary">Search</button>
         </form>

         <p className="contest-note">
            Times are shown in your local timezone. Questions are open only
            while a contest is live.
         </p>

         {renderBody()}
      </main>
   );
};

export default ContestsPage;
