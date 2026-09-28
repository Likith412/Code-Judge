import { useState } from "react";
import { Link } from "react-router-dom";

import { forgotPassword } from "../../services/api/auth";
import { apiError } from "../../services/api/client";

import Field from "../../components/Field";
import Notice from "../../components/Notice";

import "./index.css";

const ForgotPasswordPage = () => {
   const [email, setEmail] = useState("");
   const [sent, setSent] = useState(false);
   const [problem, setProblem] = useState(null);
   const [busy, setBusy] = useState(false);

   // Shared by the form and the "send it again" button on the confirmation.
   const send = async () => {
      setBusy(true);
      setProblem(null);

      try {
         await forgotPassword({ email });
         setSent(true);
      } catch (error) {
         setProblem(apiError(error).message);
      } finally {
         setBusy(false);
      }
   };

   const onSubmitForm = (event) => {
      event.preventDefault();
      send();
   };

   return (
      <main className="cj-main-narrow">
         <h1 className="cj-form-title">Reset your password</h1>

         <Notice>{problem}</Notice>

         {/* The same indefinite wording as registering, for the same reason:
             this form must not become a way to find out who has an account. */}
         {sent ? (
            <>
               <p className="cj-prose">
                  If <strong>{email}</strong> has an account, a reset link is on its way. It
                  works for 30 minutes.
               </p>

               <div className="forgot-resend">
                  <button
                     type="button"
                     className="btn btn-secondary"
                     onClick={send}
                     disabled={busy}
                  >
                     {busy ? "Sending…" : "Send it again"}
                  </button>
               </div>
            </>
         ) : (
            <form className="cj-form" onSubmit={onSubmitForm} noValidate>
               <Field
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
               />

               <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={busy || !email}
               >
                  {busy ? "Sending…" : "Send reset link"}
               </button>

               <div className="cj-form-links">
                  <Link to="/login">Back to sign in</Link>
               </div>
            </form>
         )}
      </main>
   );
};

export default ForgotPasswordPage;
