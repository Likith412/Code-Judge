import { useState } from "react";

import { resendVerification } from "../../services/api/auth";
import { apiError } from "../../services/api/client";

import "./index.css";

// Helps users who signed up but haven't verified their email yet.
// The response stays vague to prevent revealing whether an account exists.
const ResendVerification = (props) => {
   const { email } = props;

   const [state, setState] = useState("idle");
   const [message, setMessage] = useState(null);

   const onClickResend = async () => {
      setState("sending");
      setMessage(null);

      try {
         const data = await resendVerification({ email });

         setState("sent");
         setMessage(data.message);
      } catch (error) {
         setState("idle");
         setMessage(apiError(error).message);
      }
   };

   if (!email) return null;

   const label = {
      idle: "Send the email again",
      sending: "Sending…",
      sent: "Email sent",
   }[state];

   return (
      <div className="resend">
         <button
            type="button"
            className="btn btn-secondary"
            onClick={onClickResend}
            disabled={state !== "idle"}
         >
            {label}
         </button>

         {message && <p className="resend-message">{message}</p>}
      </div>
   );
};

export default ResendVerification;
