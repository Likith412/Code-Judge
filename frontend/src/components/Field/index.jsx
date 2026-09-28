import { useState } from "react";

import { EyeIcon, EyeOffIcon } from "../Icons";

import "./index.css";

// label + input + one line underneath. The .field and .input classes come from
// the design system; only the error, hint and the eye button are ours.
//
// The error replaces the hint rather than stacking with it: once something is
// wrong, the rule that was broken is no longer the useful thing to read.
//
// htmlFor and the matching id are here so clicking the label focuses the input,
// which widens the target.
const Field = (props) => {
   const { label, name, error, hint, type = "text", ...input } = props;

   const [shown, setShown] = useState(false);

   const isPassword = type === "password";

   return (
      <div className="field">
         <label htmlFor={name}>{label}</label>

         <div className="field-input">
            <input
               id={name}
               name={name}
               // A revealed password is a plain text box, which also stops the
               // browser offering to save what is on screen as the password.
               type={isPassword && shown ? "text" : type}
               className={isPassword ? "input input-password" : "input"}
               {...input}
            />

            {isPassword && (
               <button
                  type="button"
                  className="field-eye"
                  onClick={() => setShown(!shown)}
                  title={shown ? "Hide password" : "Show password"}
               >
                  {shown ? <EyeOffIcon /> : <EyeIcon />}
               </button>
            )}
         </div>

         {error && <div className="field-error">{error}</div>}

         {!error && hint && <div className="field-hint">{hint}</div>}
      </div>
   );
};

export default Field;
