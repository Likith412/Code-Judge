import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { listMySubmissions } from "../../services/api/submissions";
import { apiError } from "../../services/api/client";
import VerdictTag from "../VerdictTag";
import { formatWhen } from "../../utils/date";
import { LANG_LABEL } from "../../utils/languages";

import "./index.css";

// The newest this many. Older ones are on the Submissions page.
const LIMIT = 50;

// Your submissions to one problem. refreshKey changes when a new one lands.
const ProblemSubmissions = ({ problemId, refreshKey }) => {
   const [result, setResult] = useState(null);
   const [failure, setFailure] = useState("");

   useEffect(() => {
      let cancelled = false;

      const load = async () => {
         try {
            const data = await listMySubmissions({ problemId, limit: LIMIT });

            if (cancelled) return;

            setResult(data);
            setFailure("");
         } catch (error) {
            if (!cancelled) setFailure(apiError(error).message);
         }
      };

      load();

      return () => {
         cancelled = true;
      };
   }, [problemId, refreshKey]);

   if (failure) return <p className="psubs-note">{failure}</p>;
   if (!result) return <p className="psubs-note">Loading…</p>;

   if (result.submissions.length === 0) {
      return (
         <p className="psubs-note">
            No submissions to this problem yet. Submit is the button under the
            editor.
         </p>
      );
   }

   return (
      <>
         <div className="psubs-head">
            <span>When</span>
            <span>Verdict</span>
            <span>Lang</span>
         </div>

         {result.submissions.map((row) => (
            <Link
               className="psubs-row"
               key={row.id}
               to={`/submissions/${row.id}`}
            >
               <span className="psubs-when">{formatWhen(row.createdAt)}</span>
               <span>
                  <VerdictTag status={row.status} />
               </span>
               <span>{LANG_LABEL[row.language] || row.language}</span>
            </Link>
         ))}

         {result.total > LIMIT && (
            <Link className="psubs-all" to={`/submissions?problem=${problemId}`}>
               All {result.total} submissions →
            </Link>
         )}
      </>
   );
};

export default ProblemSubmissions;
