import "./index.css";

// Reusable field with a label, input, and either an error or hint below.
const Field = (props) => {
   const { label, name, error, hint, ...input } = props;

   return (
      <div className="field">
         <label htmlFor={name}>{label}</label>

         <input id={name} name={name} className="input" {...input} />

         {error && <div className="field-error">{error}</div>}

         {!error && hint && <div className="field-hint">{hint}</div>}
      </div>
   );
};

export default Field;
