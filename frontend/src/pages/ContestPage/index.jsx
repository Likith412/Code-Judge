import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Markdown from "react-markdown";

import {
   getContest,
   joinContest,
   finishContest,
   getRankings,
} from "../../services/api/contests";
import { apiError } from "../../services/api/client";
import UserContext from "../../context/UserContext";
import ContestTimer from "../../components/ContestTimer";
import FailureView from "../../components/FailureView";
import Notice from "../../components/Notice";
import ProblemPager from "../../components/ProblemPager";
import RankingTable from "../../components/RankingTable";
import DifficultyTag from "../../components/DifficultyTag";
import { CheckIcon } from "../../components/Icons";

import "./index.css";

const apiStatusConstants = {
   initial: "INITIAL",
   success: "SUCCESS",
   failure: "FAILURE",
   inProgress: "IN_PROGRESS",
};

const STATE_LABEL = { UPCOMING: "Upcoming", LIVE: "Live", ENDED: "Ended" };

// "Sun 19 Oct, 17:12". A contest starts on a minute, so no seconds.
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
   weekday: "short",
   day: "numeric",
   month: "short",
   hour: "2-digit",
   minute: "2-digit",
});

const formatTime = (isoDate) => timeFormatter.format(new Date(isoDate));

// "2 h", "1 h 30 min" or "45 min".
function formatLength(startTime, endTime) {
   const minutes = Math.round(
      (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000,
   );

   const hours = Math.floor(minutes / 60);
   const rest = minutes % 60;

   if (!hours) return `${rest} min`;

   return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

const ContestPage = () => {
   const { slug } = useParams();
   const { user } = useContext(UserContext);
   const [params, setParams] = useSearchParams();
   const page = Number(params.get("page")) || 1;
   const [contest, setContest] = useState(null);
   const [rankings, setRankings] = useState(null);
   const [apiStatus, setApiStatus] = useState(apiStatusConstants.initial);
   const [failure, setFailure] = useState("");
   const [refreshError, setRefreshError] = useState("");
   const [reloadCount, setReloadCount] = useState(0);
   const [busy, setBusy] = useState(false);
   const [confirmFinish, setConfirmFinish] = useState(false);

   // Server time minus local time, for the timer.
   const [offset, setOffset] = useState(0);

   // The background load, so the timer can call it at the start and the end.
   const loadRef = useRef(null);

   useEffect(() => {
      let cancelled = false;
      let loading = false;
      const load = async (background = false) => {
         if (loading) return;
         loading = true;

         if (!background) setApiStatus(apiStatusConstants.inProgress);

         try {
            const [data, board] = await Promise.all([
               getContest(slug),
               getRankings(slug, { page }),
            ]);

            if (cancelled) return;
            setContest(data.contest);
            setRankings(board);
            setOffset(new Date(data.serverTime).getTime() - Date.now());
            setRefreshError("");
            setApiStatus(apiStatusConstants.success);
         } catch (error) {
            if (cancelled) return;

            if (background)
               setRefreshError("Could not refresh rankings. Retrying shortly.");
            else {
               setFailure(apiError(error).message);
               setApiStatus(apiStatusConstants.failure);
            }
         } finally {
            loading = false;
         }
      };
      loadRef.current = load;
      load();

      return () => {
         cancelled = true;
      };
   }, [slug, page, reloadCount, user?.id, user?.role]);

   const ended = contest?.state === "ENDED";

   // Every 10 s and on returning to the tab, until the contest ends.
   useEffect(() => {
      if (ended) return;

      const refresh = () => {
         if (document.visibilityState === "visible") loadRef.current?.(true);
      };

      const timer = setInterval(refresh, 10000);
      document.addEventListener("visibilitychange", refresh);

      return () => {
         clearInterval(timer);
         document.removeEventListener("visibilitychange", refresh);
      };
   }, [ended]);

   // A beat late, so the server agrees the boundary has passed.
   const onPhaseChange = useCallback(() => {
      setTimeout(() => loadRef.current?.(true), 1500);
   }, []);

   // Ends it for this person only. Quietly reloads so the problems close.
   const finish = async () => {
      setBusy(true);
      setRefreshError("");

      try {
         await finishContest(slug);
         await loadRef.current?.(true);
      } catch (error) {
         setRefreshError(apiError(error).message);
      } finally {
         setBusy(false);
         setConfirmFinish(false);
      }
   };

   const join = async () => {
      setBusy(true);
      setRefreshError("");

      try {
         await joinContest(slug);

         // Quietly, so the page does not flash a loading state.
         await loadRef.current?.(true);
      } catch (error) {
         setRefreshError(apiError(error).message);
      } finally {
         setBusy(false);
      }
   };

   // The sidebar's first card: where you stand, and what you can do.
   const renderJoinCard = () => {
      if (!contest.isPublished) {
         return user?.role === "ADMIN" ? (
            <div className="contest-card">
               <div className="contest-card-title">Draft</div>
               <p className="contest-card-text">
                  Only admins can see this contest until it is published.
               </p>

               <Link
                  className="btn btn-secondary btn-block"
                  to={`/admin/contests/${contest.slug}/edit`}
               >
                  Edit draft
               </Link>
            </div>
         ) : null;
      }

      if (contest.state === "ENDED") {
         return (
            <div className="contest-card">
               <div className="contest-card-title">Contest over</div>
               <p className="contest-card-text">
                  Submissions and problems are closed. Standings can still move
                  while submissions made before the deadline finish judging.
               </p>
            </div>
         );
      }

      if (!user) {
         return (
            <div className="contest-card">
               <div className="contest-card-title">Take part</div>
               <p className="contest-card-text">
                  Sign in and join to submit while the contest runs.
               </p>

               <Link className="btn btn-primary btn-block" to="/login">
                  Sign in to join
               </Link>
            </div>
         );
      }

      if (user.role !== "USER") return null;

      if (contest.joined && contest.finishedAt) {
         return (
            <div className="contest-card">
               <div className="contest-card-title">You ended the contest</div>
               <p className="contest-card-text">
                  At {formatTime(contest.finishedAt)}. Your score so far stays
                  in the standings.
               </p>
            </div>
         );
      }

      if (contest.joined) {
         return (
            <div className="contest-card contest-card-joined">
               <div className="contest-card-title">You are in</div>
               <p className="contest-card-text">
                  {contest.state === "LIVE"
                     ? "Pick a problem and submit. Only Submit counts, not Run."
                     : "The problems open here when the countdown ends."}
               </p>

               {contest.state === "LIVE" && (
                  <button
                     className="btn btn-secondary btn-block"
                     disabled={busy}
                     onClick={() => setConfirmFinish(true)}
                  >
                     End contest
                  </button>
               )}
            </div>
         );
      }

      return (
         <div className="contest-card">
            <div className="contest-card-title">Take part</div>
            <p className="contest-card-text">
               Join to submit while the contest runs. You can join until it
               ends.
            </p>

            <button
               className="btn btn-primary btn-block"
               disabled={busy}
               onClick={join}
            >
               {busy ? "Joining…" : "Join contest"}
            </button>
         </div>
      );
   };

   const renderDetailsCard = () => {
      const points = contest.problems.reduce((sum, row) => sum + row.points, 0);
      const rows = [
         ["Starts", formatTime(contest.startTime)],
         ["Ends", formatTime(contest.endTime)],
         ["Length", formatLength(contest.startTime, contest.endTime)],
         ["Participants", contest.participantCount],
         ["Penalty", `${contest.penaltyPerWrongMin} min per wrong Submit`],
      ];

      if (contest.problems.length) {
         rows.push(["Problems", `${contest.problems.length} · ${points} pts`]);
      }

      return (
         <div className="contest-card">
            <div className="contest-card-title">Details</div>
            <dl className="contest-details">
               {rows.map(([label, value]) => (
                  <div className="contest-details-row" key={label}>
                     <dt>{label}</dt>
                     <dd>{value}</dd>
                  </div>
               ))}
            </dl>
         </div>
      );
   };

   const renderRulesCard = () => (
      <div className="contest-card">
         <div className="contest-card-title">How scoring works</div>
         <ul className="contest-rules">
            <li>A problem scores its points on your first accepted Submit.</li>
            <li>Higher score ranks first. On a tie, lower penalty wins.</li>
            <li>
               Penalty: the minute of each first accept, plus{" "}
               {contest.penaltyPerWrongMin}{" "}
               {contest.penaltyPerWrongMin === 1 ? "minute" : "minutes"} for
               every wrong Submit before it.
            </li>

            <li>Runs, unsolved problems and system errors add nothing.</li>
         </ul>
      </div>
   );

   const renderProblems = () => {
      if (contest.problems.length === 0) {
         const [title, text] =
            contest.finishedAt && contest.state === "LIVE"
               ? ["You ended this contest", "The problems are closed for you."]
               : contest.state === "ENDED"
                 ? [
                      "The problems are closed",
                      "They were open only while the contest ran.",
                   ]
                 : [
                      "The problems are hidden",
                      "They appear here the moment the contest starts.",
                   ];

         return (
            <div className="contest-locked">
               <div className="contest-locked-title">{title}</div>
               <p>{text}</p>
            </div>
         );
      }

      // The same columns and type as the main problem list.
      return (
         <>
            <div className="contest-problems-head">
               <span aria-hidden="true" />
               <span>#</span>
               <span>Problem</span>
               <span>Difficulty</span>
               <span className="contest-problem-points">Points</span>
            </div>

            {contest.problems.map((problem) => (
               <Link
                  className="contest-problem"
                  key={problem.problemId}
                  to={`/contests/${contest.slug}/problems/${problem.slug}`}
               >
                  {/* Solved in this contest, the same tick as the problem list. */}
                  <span className="contest-problem-tick">
                     {problem.solved && <CheckIcon />}
                  </span>

                  <span className="contest-problem-letter">
                     {problem.label}
                  </span>

                  <span className="contest-problem-title">{problem.title}</span>
                  <span>
                     {problem.difficulty && (
                        <DifficultyTag difficulty={problem.difficulty} />
                     )}
                  </span>

                  <span className="contest-problem-points">
                     {problem.points}
                  </span>
               </Link>
            ))}
         </>
      );
   };

   const renderContest = () => {
      const state = contest.isPublished ? contest.state : "DRAFT";

      return (
         <main className="cj-main">
            <Link className="contest-back" to="/contests">
               ← All contests
            </Link>

            {/* The one dark block on the page: what this is, and how long. */}
            <header className="contest-hero">
               <div className="contest-hero-main">
                  <span
                     className={`contest-pill contest-pill-${state.toLowerCase()}`}
                  >
                     {STATE_LABEL[state] || "Draft"}
                  </span>

                  <h1 className="contest-hero-title">{contest.title}</h1>
                  <div className="contest-hero-when">
                     {formatTime(contest.startTime)} →{" "}
                     {formatTime(contest.endTime)} ·{" "}
                     {formatLength(contest.startTime, contest.endTime)}
                  </div>
               </div>

               {/* Ended needs no clock: the pill already says so. */}
               {contest.isPublished && contest.state !== "ENDED" && (
                  <ContestTimer
                     startTime={contest.startTime}
                     endTime={contest.endTime}
                     offset={offset}
                     onPhaseChange={onPhaseChange}
                  />
               )}
            </header>

            <Notice tone="note">{refreshError}</Notice>

            <div className="contest-layout">
               <div className="contest-content">
                  {contest.description && (
                     <div className="contest-description">
                        <Markdown>{contest.description}</Markdown>
                     </div>
                  )}

                  <section className="contest-section">
                     <h2 className="contest-section-title">Problems</h2>
                     {renderProblems()}
                  </section>

                  <section className="contest-section">
                     <div className="contest-section-head">
                        <h2 className="contest-section-title">Standings</h2>
                        <span className="cj-muted">
                           Updates every 10 seconds
                        </span>
                     </div>

                     <RankingTable
                        rows={rankings.rankings}
                        me={user?.username}
                     />

                     {rankings.total > rankings.limit && (
                        <ProblemPager
                           {...rankings}
                           onGo={(number) =>
                              setParams(number > 1 ? { page: number } : {})
                           }
                        />
                     )}
                  </section>
               </div>

               {/* Two parts, so on a phone joining comes first and the rest last. */}
               <aside className="contest-side contest-side-join">
                  {renderJoinCard()}
               </aside>

               <aside className="contest-side contest-side-info">
                  {renderDetailsCard()}
                  {renderRulesCard()}
               </aside>
            </div>

            {/* Cannot be undone, so it asks first. */}
            {confirmFinish && (
               <div className="dialog-backdrop">
                  <div
                     className="dialog"
                     role="dialog"
                     aria-modal="true"
                     aria-labelledby="finish-contest"
                  >
                     <div className="dialog-title" id="finish-contest">
                        End the contest for you?
                     </div>

                     <div className="dialog-body">
                        You cannot submit or open the problems again. Your score
                        so far stays, and Submits still being judged still
                        count. Everyone else carries on.
                     </div>

                     <div className="dialog-actions">
                        <button
                           className="btn btn-secondary"
                           disabled={busy}
                           onClick={() => setConfirmFinish(false)}
                        >
                           Keep going
                        </button>

                        <button
                           className="btn btn-primary"
                           disabled={busy}
                           onClick={finish}
                        >
                           {busy ? "Ending…" : "End contest"}
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
         return renderContest();
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
               <p className="cj-muted">Loading contest…</p>
            </main>
         );
      default:
         return null;
   }
};

export default ContestPage;
