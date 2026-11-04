import { useContext, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { resetPassword } from "../../services/api/auth";
import { apiError, fieldErrors } from "../../services/api/client";

import UserContext from "../../context/UserContext";

import Field from "../../components/Field";
import Notice from "../../components/Notice";
import { readLinkToken } from "../../utils/linkToken";

import "./index.css";

// The token is only spent on submit, so a dead link shows up only then.
const DEAD_LINKS = {
   LINK_EXPIRED: {
      title: "This reset link has expired",
      body: "Reset links work for 30 minutes. Request a new one and open it straight away.",
   },
   LINK_USED: {
      title: "This link was already used",
      body: "Your password was changed with it. If that wasn’t you, request a new reset now — it signs out every device.",
      signIn: true,
   },
   LINK_INVALID: {
      title: "That link isn’t valid",
      body: "It may have been cut off when copied. Open the most recent email and try the link again, or request a new one.",
   },
};

const ResetPasswordPage = () => {
   const [params] = useSearchParams();
   const token = readLinkToken(params);

   const { user, signOut } = useContext(UserContext);

   const [password, setPassword] = useState("");
   const [fieldError, setFieldError] = useState(null);
   const [problem, setProblem] = useState(null);
   const [busy, setBusy] = useState(false);
   const [done, setDone] = useState(false);

   // No token at all is decided before the first render.
   const [deadLink, setDeadLink] = useState(() =>
      token ? null : DEAD_LINKS.LINK_INVALID,
   );

   const onSubmitForm = async (event) => {
      event.preventDefault();

      setBusy(true);
      setFieldError(null);
      setProblem(null);

      try {
         await resetPassword({ token, password });

         // Every session is gone, so drop the local token as well.
         if (user) await signOut();

         setDone(true);
      } catch (error) {
         const { code, message } = apiError(error);

         if (DEAD_LINKS[code]) setDeadLink(DEAD_LINKS[code]);
         else if (code === "VALIDATION_ERROR")
            setFieldError(fieldErrors(error).password);
         else setProblem(message);
      } finally {
         setBusy(false);
      }
   };

   if (done) {
      return (
         <main className="cj-main-narrow">
            <h1 className="cj-screen-title">Password changed</h1>

            <p className="cj-prose">
               Every device was signed out, including this one. Sign in with
               your new password.
            </p>

            <Link to="/login" className="btn btn-primary">
               Sign in
            </Link>
         </main>
      );
   }

   if (deadLink) {
      return (
         <main className="cj-main-narrow">
            <h1 className="cj-screen-title">{deadLink.title}</h1>

            <p className="cj-prose">{deadLink.body}</p>

            <div className="reset-actions">
               {deadLink.signIn && (
                  <Link to="/login" className="btn btn-primary">
                     Sign in
                  </Link>
               )}

               <Link
                  to="/forgot-password"
                  className={
                     deadLink.signIn ? "btn btn-secondary" : "btn btn-primary"
                  }
               >
                  Request a new link
               </Link>
            </div>
         </main>
      );
   }

   return (
      <main className="cj-main-narrow">
         <h1 className="cj-form-title">Choose a new password</h1>

         <Notice>{problem}</Notice>

         <form className="cj-form" onSubmit={onSubmitForm} noValidate>
            <Field
               label="New password"
               name="password"
               type="password"
               autoComplete="new-password"
               value={password}
               onChange={(event) => setPassword(event.target.value)}
               error={fieldError}
               required
            />

            {/* Said before the button, while people are still deciding. */}
            <p className="reset-warning">
               <strong>This signs you out everywhere</strong>, including this
               device. You’ll sign in again with the new password.
            </p>

            <button
               type="submit"
               className="btn btn-primary btn-block"
               disabled={busy || !password}
            >
               {busy ? "Saving…" : "Set password and sign out everywhere"}
            </button>
         </form>
      </main>
   );
};

export default ResetPasswordPage;
