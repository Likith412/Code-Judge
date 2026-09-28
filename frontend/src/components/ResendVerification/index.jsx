import { useState } from "react";

import { resendVerification } from "../../services/api/auth";
import { apiError } from "../../services/api/client";

import "./index.css";

// Helps users resend verification emails without revealing whether an account exists.
// The button stays visible but disabled until an address is entered.
const ResendVerification = (props) => {
   const { email, variant = "secondary", block = false } = props;

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

   const label = {
      idle: "Send the email again",
      sending: "Sending…",
      sent: "Email sent",
   }[state];

   return (
      <div className="resend">
         <button
            type="button"
            className={`btn btn-${variant}${block ? " btn-block" : ""}`}
            onClick={onClickResend}
            disabled={state !== "idle" || !email}
         >
            {label}
         </button>

         {message && <p className="resend-message">{message}</p>}
      </div>
   );
};

export default ResendVerification;
