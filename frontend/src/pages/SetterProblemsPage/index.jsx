import { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { listProblems } from "../../services/api/problems";
import { apiError } from "../../services/api/client";
import DifficultyTag from "../../components/DifficultyTag";
import ProblemPager from "../../components/ProblemPager";
import UserContext from "../../context/UserContext";

import "./index.css";

const apiStatusConstants = {
   initial: "INITIAL",
   success: "SUCCESS",
   failure: "FAILURE",
   inProgress: "IN_PROGRESS",
};

const PAGE_SIZE = 20;

// A setter sees the problems they wrote. An admin sees every problem.
const SetterProblemsPage = () => {
   const { user } = useContext(UserContext);
   const admin = user?.role === "ADMIN";

   const navigate = useNavigate();
   const [searchParams, setSearchParams] = useSearchParams();
   const page = Number(searchParams.get("page")) || 1;

   const [result, setResult] = useState(null);
   const [apiStatus, setApiStatus] = useState(apiStatusConstants.initial);
   const [failure, setFailure] = useState("");
   const [reloadCount, setReloadCount] = useState(0);

   useEffect(() => {
      let cancelled = false;

      const load = async () => {
         setApiStatus(apiStatusConstants.inProgress);

         try {
            const data = await listProblems({
               status: "ALL",
               mine: admin ? "" : "true",
               page,
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
   }, [admin, page, reloadCount]);

   // The row opens the problem as users see it. Edit opens the editor.
   const renderRow = (problem) => {
      const open = () => navigate(`/problems/${problem.slug}`);

      return (
         <div
            className="setter-row"
            key={problem.id}
            role="link"
            tabIndex={0}
            onClick={open}
            onKeyDown={(event) => event.key === "Enter" && open()}
         >
            <span className="setter-title">{problem.title}</span>

            <span>
               <span
                  className={
                     problem.isPublished
                        ? "setter-status setter-status-live"
                        : "setter-status"
                  }
               >
                  {problem.isPublished ? "Published" : "Draft"}
               </span>
            </span>

            <span>
               <DifficultyTag difficulty={problem.difficulty} />
            </span>

            <span className="setter-num">{problem.testCaseCount}</span>

            <span className="setter-actions">
               <Link
                  className="btn btn-secondary setter-edit"
                  to={`/setter/problems/${problem.slug}/edit`}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
               >
                  Edit
               </Link>
            </span>
         </div>
      );
   };

   const renderList = () => {
      if (result.problems.length === 0) {
         return (
            <div className="setter-empty">
               <div className="setter-empty-title">No problems yet</div>
               <p className="setter-empty-body">
                  Write your first one. It stays a draft until you publish it.
               </p>
               <Link className="btn btn-primary" to="/setter/problems/new">
                  New problem
               </Link>
            </div>
         );
      }

      return (
         <>
            <div className="setter-head">
               <span>Title</span>
               <span>Status</span>
               <span>Difficulty</span>
               <span>Tests</span>
               <span />
            </div>

            {result.problems.map(renderRow)}

            <ProblemPager
               page={result.page}
               limit={result.limit}
               total={result.total}
               totalPages={result.totalPages}
               onGo={(number) =>
                  setSearchParams(number > 1 ? { page: String(number) } : {})
               }
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
               <div className="setter-empty">
                  <div className="setter-empty-title">
                     Could not load problems
                  </div>
                  <p className="setter-empty-body">{failure}</p>
                  <button
                     type="button"
                     className="btn btn-secondary"
                     onClick={() => setReloadCount((count) => count + 1)}
                  >
                     Try again
                  </button>
               </div>
            );
         case apiStatusConstants.inProgress:
            return <p className="setter-loading">Loading problems…</p>;
         default:
            return null;
      }
   };

   const word = result?.total === 1 ? "problem" : "problems";

   return (
      <main className="cj-main">
         <header className="setter-header">
            <div>
               <h1 className="setter-heading">
                  {admin ? "All problems" : "Your problems"}
               </h1>
               <div className="setter-count">
                  {result ? `${result.total} ${word}, drafts included` : "…"}
               </div>
            </div>

            <Link className="btn btn-primary" to="/setter/problems/new">
               New problem
            </Link>
         </header>

         {renderBody()}
      </main>
   );
};

export default SetterProblemsPage;
