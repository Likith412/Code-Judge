import { useState } from "react";

import { EyeIcon, EyeOffIcon } from "../Icons";

import "./index.css";

// Label, input, and one line under it. An error replaces the hint.
const Field = (props) => {
   const {
      label,
      name,
      error,
      hint,
      multiline,
      type = "text",
      ...input
   } = props;

   const [shown, setShown] = useState(false);

   const isPassword = type === "password";

   return (
      <div className="field">
         <label htmlFor={name}>{label}</label>

         <div className="field-input">
            {multiline ? (
               <textarea id={name} name={name} className="input" {...input} />
            ) : (
               <input
                  id={name}
                  name={name}
                  type={isPassword && shown ? "text" : type}
                  className={isPassword ? "input input-password" : "input"}
                  {...input}
               />
            )}

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
