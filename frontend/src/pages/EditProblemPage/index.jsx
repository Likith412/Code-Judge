import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
   deleteProblem,
   getProblemForEdit,
   updateProblem,
} from "../../services/api/problems";
import { apiError, fieldErrors } from "../../services/api/client";
import FailureView from "../../components/FailureView";
import ProblemForm from "../../components/ProblemForm";
import { toBody, toDraft } from "../../components/ProblemForm/draft";
import PublishBar from "../../components/PublishBar";
import SaveNotice from "../../components/SaveNotice";
import SetterTabs from "../../components/SetterTabs";

import "./index.css";

const apiStatusConstants = {
   initial: "INITIAL",
   success: "SUCCESS",
   failure: "FAILURE",
   inProgress: "IN_PROGRESS",
};

// An existing problem, found by the slug in the url. Writes go by its id.
const EditProblemPage = () => {
   const { slug } = useParams();
   const navigate = useNavigate();

   const [saved, setSaved] = useState(null);
   const [draft, setDraft] = useState(null);
   const [apiStatus, setApiStatus] = useState(apiStatusConstants.initial);
   const [failure, setFailure] = useState(null);
   const [reloadCount, setReloadCount] = useState(0);

   const [busy, setBusy] = useState(false);
   const [message, setMessage] = useState(null);
   const [errors, setErrors] = useState({});
   const [confirmDelete, setConfirmDelete] = useState(false);

   useEffect(() => {
      let cancelled = false;

      const load = async () => {
         setApiStatus(apiStatusConstants.inProgress);

         try {
            const data = await getProblemForEdit(slug);

            if (cancelled) return;

            setSaved(data.problem);
            setDraft(toDraft(data.problem));
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

   const published = Boolean(saved?.isPublished);
   const dirty =
      saved &&
      JSON.stringify(toBody(draft)) !== JSON.stringify(toBody(toDraft(saved)));

   const set = (changes) => setDraft((current) => ({ ...current, ...changes }));

   // Saves the form. extra adds fields, like isPublished from the bar.
   const save = async (extra = {}) => {
      setBusy(true);
      setMessage(null);
      setErrors({});

      try {
         const data = await updateProblem(saved.id, {
            ...toBody(draft),
            ...extra,
         });

         // A new slug means a new url, or a reload would find nothing.
         if (data.problem.slug !== slug) {
            navigate(`/setter/problems/${data.problem.slug}/edit`, {
               replace: true,
            });
         }

         setSaved(data.problem);
         setDraft(toDraft(data.problem));
         setMessage({
            tone: "note",
            text:
               extra.isPublished === true
                  ? "Published. Users can open it now."
                  : extra.isPublished === false
                    ? "Unpublished. It is a draft again."
                    : "Saved.",
         });
      } catch (error) {
         setErrors(fieldErrors(error));
         setMessage({ tone: "error", text: apiError(error).message });
      } finally {
         setBusy(false);
      }
   };

   const onDelete = async () => {
      setBusy(true);

      try {
         await deleteProblem(saved.id);
         navigate("/setter/problems", { replace: true });
      } catch (error) {
         setConfirmDelete(false);
         setMessage({ tone: "error", text: apiError(error).message });
         setBusy(false);
      }
   };

   const renderConfirmDelete = () => (
      <div className="dialog-backdrop">
         <div className="dialog" role="dialog">
            <div className="dialog-title">Delete this problem?</div>
            <div className="dialog-body">
               The problem and all of its test cases are removed. There is no
               undo.
            </div>
            <div className="dialog-actions">
               <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setConfirmDelete(false)}
               >
                  Keep it
               </button>
               <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onDelete}
                  disabled={busy}
               >
                  Delete
               </button>
            </div>
         </div>
      </div>
   );

   const renderEditor = () => (
      <main className="cj-main">
         <div className="editor-top">
            <SetterTabs slug={slug} active="editor" />

            <div className="editor-actions">
               {dirty && <span className="editor-dirty">Unsaved changes</span>}

               <Link
                  className="btn btn-secondary"
                  to={`/problems/${saved.slug}`}
               >
                  View as user
               </Link>

               <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => save()}
                  disabled={busy}
               >
                  Save
               </button>
            </div>
         </div>

         <PublishBar
            published={published}
            note={
               published
                  ? "Visible to everyone. Edits go live on save."
                  : "Invisible to users. Only setters and admins can open it."
            }
            onToggle={() => save({ isPublished: !published })}
            disabled={busy}
         />
         <SaveNotice message={message} errors={errors} />

         <ProblemForm draft={draft} onChange={set} errors={errors} />

         {!published && (
            <div className="editor-danger">
               <button
                  type="button"
                  className="btn btn-ghost editor-delete"
                  onClick={() => setConfirmDelete(true)}
               >
                  Delete problem
               </button>
               <span>Only a draft can be deleted.</span>
            </div>
         )}

         {confirmDelete && renderConfirmDelete()}
      </main>
   );

   // Missing, or someone else's: the server says the same for both.
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
         return renderEditor();
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
               <p className="editor-loading">Loading problem…</p>
            </main>
         );
      default:
         return null;
   }
};

export default EditProblemPage;
