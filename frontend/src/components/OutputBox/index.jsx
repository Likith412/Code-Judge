import "./index.css";

// One labelled block of input or output. mine marks the user's own output.
const OutputBox = ({ label, text, mine, passed }) => (
   <div className={passed ? "result-io-box result-io-pass" : "result-io-box"}>
      <div
         className={mine ? "result-io-label result-io-mine" : "result-io-label"}
      >
         {label}
      </div>

      <pre className={mine ? "result-io result-io-actual" : "result-io"}>
         {text || " "}
      </pre>
   </div>
);

export default OutputBox;
