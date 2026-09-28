import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { verifyEmail } from "../../services/api/auth";
import { apiError } from "../../services/api/client";

import Field from "../../components/Field";
import ResendVerification from "../../components/ResendVerification";


// Where the emailed link lands. Four ways it can end, and each one needs a way
// forward — a dead end here means an account nobody can use.
const OUTCOMES = {
   verified: {
      title: "Email verified",
      body: "You can run and submit code now.",
   },
   LINK_EXPIRED: {
      title: "This link has expired",
      body: "Verification links work for 24 hours. Send yourself a fresh one — it takes a moment.",
      resend: true,
   },
   LINK_USED: {
      title: "Already verified",
      body: "This link was used once and that’s all it needed. Your email is confirmed.",
   },
   LINK_INVALID: {
      title: "That link isn’t valid",
      body: "It may have been cut off when copied. Open the most recent email and try the link again, or send a new one.",
      resend: true,
   },
};

const VerifyPage = () => {
   const [params] = useSearchParams();
   const token = params.get("token");

   const [outcome, setOutcome] = useState(() =>
      token ? null : OUTCOMES.LINK_INVALID,
   );
   const [email, setEmail] = useState("");

   useEffect(() => {
      if (!token) return;

      verifyEmail(token)
         .then(() => setOutcome(OUTCOMES.verified))
         .catch((error) =>
            setOutcome(OUTCOMES[apiError(error).code] || OUTCOMES.LINK_INVALID),
         );
   }, [token]);

   if (!outcome) {
      return (
         <main className="cj-main-narrow">
            <p className="cj-muted">Confirming your address…</p>
         </main>
      );
   }

   return (
      <main className="cj-main-narrow">
         <h1 className="cj-screen-title">{outcome.title}</h1>

         <p className="cj-prose">{outcome.body}</p>

         {outcome === OUTCOMES.verified && (
            <Link to="/problems" className="btn btn-primary">
               Go to problems
            </Link>
         )}

         {outcome === OUTCOMES.LINK_USED && (
            <Link to="/login" className="btn btn-primary">
               Sign in
            </Link>
         )}

         {/* A dead link carries no address, and the server will not say whose
             it was. So the new one has to be asked for by hand. */}
         {outcome.resend && (
            <div className="cj-form">
               <Field
                  label="Your email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
               />

               <ResendVerification email={email} variant="primary" block />

               <div className="cj-form-links">
                  <Link to="/login">Back to sign in</Link>
               </div>
            </div>
         )}
      </main>
   );
};

export default VerifyPage;
