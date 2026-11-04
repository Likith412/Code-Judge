import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import Field from "../../components/Field";
import ResendVerification from "../../components/ResendVerification";

import "./index.css";

// Where registering lands. The address may come with it, or may not.
const CheckEmailPage = () => {
   const location = useLocation();

   const known = location.state?.email;
   const [email, setEmail] = useState(known || "");

   return (
      <main className="cj-main-narrow">
         <h1 className="cj-form-title">Check your email</h1>

         {/* Not "account created": the server answers the same either way. */}
         <p className="cj-prose">
            If <strong>{known || "that address"}</strong> is new here, a
            confirmation link is on its way. Open it within 24 hours to finish.
         </p>

         <p className="cj-prose check-email-aside">
            Already have an account with that address? Nothing was sent -{" "}
            <Link to="/login">sign in</Link> instead.
         </p>

         {!known && (
            <div className="check-email-field">
               <Field
                  label="Your email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
               />
            </div>
         )}

         <div className="check-email-resend">
            <ResendVerification email={email} />
         </div>
      </main>
   );
};

export default CheckEmailPage;
