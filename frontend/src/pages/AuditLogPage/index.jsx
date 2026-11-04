import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { listAudit } from "../../services/api/admin";
import { apiError } from "../../services/api/client";
import PageHeader from "../../components/PageHeader";
import ProblemPager from "../../components/ProblemPager";
import LoadFailed from "../../components/LoadFailed";
import { formatMoment } from "../../utils/date";

import "./index.css";

const apiStatusConstants = {
   initial: "INITIAL",
   success: "SUCCESS",
   failure: "FAILURE",
   inProgress: "IN_PROGRESS",
};

// ROLE_CHANGED reads as "Role changed".
const actionLabel = (action) => {
   const words = action.toLowerCase().replace(/_/g, " ");

   return words.charAt(0).toUpperCase() + words.slice(1);
};

// The target by name where there is one, with a link where it helps.
const renderTarget = (event) => {
   if (!event.targetType) return <span className="cj-muted">—</span>;

   if (event.targetType === "SUBMISSION") {
      return <Link to={`/submissions/${event.targetId}`}>Submission</Link>;
   }

   return (
      event.targetName || (
         <span className="cj-muted">
            {event.targetType.toLowerCase()} (deleted)
         </span>
      )
   );
};

// Admin actions and security events, newest first.
const AuditLogPage = () => {
   const [params, setParams] = useSearchParams();
   const page = Number(params.get("page")) || 1;
   const action = params.get("action") || "";
   const actorId = params.get("actorId") || "";

   const [result, setResult] = useState(null);
   const [apiStatus, setApiStatus] = useState(apiStatusConstants.initial);
   const [failure, setFailure] = useState("");
   const [reloadCount, setReloadCount] = useState(0);

   useEffect(() => {
      let cancelled = false;

      const load = async () => {
         setApiStatus(apiStatusConstants.inProgress);

         try {
            const data = await listAudit({ page, action, actorId });

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
   }, [page, action, actorId, reloadCount]);

   // A new filter goes back to page one. Empty ones leave the url.
   const changeParams = (changes) => {
      const next = { ...Object.fromEntries(params), page: 1, ...changes };

      setParams(
         Object.fromEntries(
            Object.entries(next).filter(
               ([key, value]) =>
                  value && !(key === "page" && Number(value) === 1),
            ),
         ),
      );
   };

   const renderRow = (event) => (
      <div className="audit-row" key={event.id}>
         <span className="audit-time">{formatMoment(event.createdAt)}</span>
         <span className="audit-action">{actionLabel(event.action)}</span>
         <span className="audit-actor">
            {event.actor ? (
               <button
                  className="audit-link"
                  title="Show only this account's events"
                  onClick={() => changeParams({ actorId: event.actor.id })}
               >
                  @{event.actor.username}
               </button>
            ) : (
               <span className="cj-muted">Nobody</span>
            )}
         </span>

         <span className="audit-target">{renderTarget(event)}</span>
         <span className="audit-ip cj-muted">{event.ip || "—"}</span>
         {event.meta && (
            <details className="audit-details">
               <summary>Details</summary>
               <pre className="audit-meta">
                  {JSON.stringify(event.meta, null, 2)}
               </pre>
            </details>
         )}
      </div>
   );

   const renderList = () => {
      if (result.events.length === 0) {
         return <p className="cj-muted audit-empty">No events match.</p>;
      }

      return (
         <>
            <div className="audit-head">
               <span>Time</span>
               <span>Action</span>
               <span>By</span>
               <span className="audit-target">Target</span>
               <span className="audit-ip">IP</span>
            </div>

            {result.events.map(renderRow)}

            <ProblemPager
               {...result}
               onGo={(number) => changeParams({ page: number })}
            />
         </>
      );
   };

   const renderBody = () => {
      switch (apiStatus) {
         case apiStatusConstants.success:
            return renderList();
         case apiStatusConstants.failure:
            return (
               <LoadFailed
                  title="Could not load the audit log"
                  message={failure}
                  onRetry={() => setReloadCount((count) => count + 1)}
               />
            );
         case apiStatusConstants.inProgress:
            return <p className="cj-muted audit-empty">Loading events…</p>;
         default:
            return null;
      }
   };

   // The current pick stays in the list even before the actions load.
   const actions = result?.actions || [];
   const actionOptions =
      action && !actions.includes(action) ? [action, ...actions] : actions;

   // Filtered by actor, every row is theirs, so any row can name them.
   const actorName = actorId && result?.events[0]?.actor?.username;
   const word = result?.total === 1 ? "event" : "events";

   return (
      <main className="cj-main">
         <PageHeader
            title="Audit log"
            count={result ? `${result.total} ${word}, kept for 90 days` : " "}
         />

         <div className="audit-tools">
            <select
               className="input audit-select"
               value={action}
               onChange={(event) =>
                  changeParams({ action: event.target.value })
               }
               aria-label="Filter by action"
            >
               <option value="">All actions</option>
               {actionOptions.map((option) => (
                  <option key={option} value={option}>
                     {actionLabel(option)}
                  </option>
               ))}
            </select>

            {actorId ? (
               <span className="audit-filter">
                  Only events by <strong>@{actorName || actorId}</strong>
                  <button
                     className="btn btn-ghost"
                     onClick={() => changeParams({ actorId: "" })}
                  >
                     Clear
                  </button>
               </span>
            ) : (
               <span className="cj-muted audit-hint">
                  Click a name to see only that account's events.
               </span>
            )}
         </div>

         {renderBody()}
      </main>
   );
};

export default AuditLogPage;
