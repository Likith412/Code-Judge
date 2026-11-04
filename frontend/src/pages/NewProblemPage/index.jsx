import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { createProblem } from "../../services/api/problems";
import { apiError, fieldErrors } from "../../services/api/client";
import ProblemForm from "../../components/ProblemForm";
import { EMPTY_DRAFT, toBody } from "../../components/ProblemForm/draft";
import PublishBar from "../../components/PublishBar";
import SaveNotice from "../../components/SaveNotice";
import SetterTabs from "../../components/SetterTabs";

// A blank problem. Creating it saves a draft and moves on to editing it.
const NewProblemPage = () => {
   const navigate = useNavigate();

   const [draft, setDraft] = useState(EMPTY_DRAFT);
   const [busy, setBusy] = useState(false);
   const [message, setMessage] = useState(null);
   const [errors, setErrors] = useState({});

   const dirty = JSON.stringify(draft) !== JSON.stringify(EMPTY_DRAFT);

   const set = (changes) => setDraft((current) => ({ ...current, ...changes }));

   const create = async () => {
      setBusy(true);
      setMessage(null);
      setErrors({});

      try {
         const data = await createProblem(toBody(draft));

         // Its editor, so the url has the slug the server chose.
         navigate(`/setter/problems/${data.problem.slug}/edit`, {
            replace: true,
         });
      } catch (error) {
         setErrors(fieldErrors(error));
         setMessage({ tone: "error", text: apiError(error).message });
         setBusy(false);
      }
   };

   return (
      <main className="cj-main">
         <div className="editor-top">
            <SetterTabs active="editor" />

            <div className="editor-actions">
               {dirty && <span className="editor-dirty">Unsaved changes</span>}

               <button
                  type="button"
                  className="btn btn-primary"
                  onClick={create}
                  disabled={busy}
               >
                  Create draft
               </button>
            </div>
         </div>

         <PublishBar
            published={false}
            note="Save it first, then add test cases. Publishing needs at least one, and one sample."
            disabled
         />

         <SaveNotice message={message} errors={errors} />

         <ProblemForm draft={draft} onChange={set} errors={errors} isNew />
      </main>
   );
};

export default NewProblemPage;
