import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { register } from "../../services/api/auth";
import { apiError, fieldErrors } from "../../services/api/client";

import Field from "../../components/Field";
import Notice from "../../components/Notice";

const RegisterPage = () => {
   const navigate = useNavigate();

   const [form, setForm] = useState({ username: "", email: "", password: "" });
   const [fields, setFields] = useState({});
   const [problem, setProblem] = useState(null);
   const [busy, setBusy] = useState(false);

   const onChangeField = (event) =>
      setForm({ ...form, [event.target.name]: event.target.value });

   const onSubmitForm = async (event) => {
      event.preventDefault();

      setBusy(true);
      setFields({});
      setProblem(null);

      try {
         await register(form);

         // The server never says if the email was free, so nor does the next page.
         navigate("/check-email", {
            replace: true,
            state: { email: form.email },
         });
      } catch (error) {
         const { code, message } = apiError(error);

         // A taken username is shown. A taken email looks like success.
         if (code === "VALIDATION_ERROR") setFields(fieldErrors(error));
         else setProblem(message);
      } finally {
         setBusy(false);
      }
   };

   return (
      <main className="cj-main-narrow">
         <h1 className="cj-form-title">Create an account</h1>

         <Notice>{problem}</Notice>

         <form className="cj-form" onSubmit={onSubmitForm} noValidate>
            <Field
               label="Username"
               name="username"
               autoComplete="username"
               value={form.username}
               onChange={onChangeField}
               error={fields.username}
               hint="3–20 characters. Letters, numbers, underscore."
               required
            />

            <Field
               label="Email"
               name="email"
               type="email"
               autoComplete="email"
               value={form.email}
               onChange={onChangeField}
               error={fields.email}
               required
            />

            <Field
               label="Password"
               name="password"
               type="password"
               autoComplete="new-password"
               value={form.password}
               onChange={onChangeField}
               error={fields.password}
               required
            />

            <button
               type="submit"
               className="btn btn-primary btn-block"
               disabled={busy}
            >
               {busy ? "Creating…" : "Create account"}
            </button>

            <div className="cj-form-links">
               <Link to="/login">Already have an account? Sign in</Link>
            </div>
         </form>
      </main>
   );
};

export default RegisterPage;
