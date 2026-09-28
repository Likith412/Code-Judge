import { useContext, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { apiError } from "../../services/api/client";

import UserContext from "../../context/UserContext";

import Field from "../../components/Field";
import Notice from "../../components/Notice";
import ResendVerification from "../../components/ResendVerification";

import "./index.css";

const LoginPage = () => {
   const { signIn } = useContext(UserContext);

   const navigate = useNavigate();
   const location = useLocation();

   const [form, setForm] = useState({ email: "", password: "" });
   const [problem, setProblem] = useState(null);
   const [busy, setBusy] = useState(false);

   const onChangeField = (event) =>
      setForm({ ...form, [event.target.name]: event.target.value });

   const onSubmitForm = async (event) => {
      event.preventDefault();

      setBusy(true);
      setProblem(null);

      try {
         await signIn(form);

         // Back to whatever they were trying to reach, which ProtectedRoutes
         // remembered on the way past.
         navigate(location.state?.from || "/problems", { replace: true });
      } catch (error) {
         setProblem(apiError(error));
      } finally {
         setBusy(false);
      }
   };

   return (
      <main className="cj-main-narrow">
         <h1 className="cj-form-title">Sign in</h1>

         {/* The password was right and the address is not confirmed. That is an
             unfinished step, not a failure, so it gets the quiet tone and the
             resend control instead of a red box. */}
         {problem?.code === "EMAIL_NOT_VERIFIED" ? (
            <Notice tone="note">
               <span>
                  <strong>One step left.</strong> Your email isn’t verified yet
                  - open the link we sent to {form.email}.
               </span>

               <div>
                  <ResendVerification email={form.email} />
               </div>
            </Notice>
         ) : (
            // One message for a wrong address and a wrong password. Which of the
            // two it was is not the browser's business.
            <Notice>{problem?.message}</Notice>
         )}

         <form className="cj-form" onSubmit={onSubmitForm} noValidate>
            <Field
               label="Email"
               name="email"
               type="email"
               autoComplete="email"
               value={form.email}
               onChange={onChangeField}
               required
            />

            <Field
               label="Password"
               name="password"
               type="password"
               autoComplete="current-password"
               value={form.password}
               onChange={onChangeField}
               required
            />

            <button
               type="submit"
               className="btn btn-primary btn-block"
               disabled={busy}
            >
               {busy ? "Signing in…" : "Sign in"}
            </button>

            <div className="cj-form-links">
               <Link to="/forgot-password">Forgot password?</Link>
               <Link to="/register">Create an account</Link>
            </div>

            <p className="login-session-note">
               Sessions last 14 days on this device. There’s no “remember me” -
               it’s always on.
            </p>
         </form>
      </main>
   );
};

export default LoginPage;
