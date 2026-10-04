import "./index.css";

const ResultPanel = (props) => {
   const { sampleCount, testCount, signedIn, solves } = props;

   const gate = !signedIn
      ? "Running code needs an account."
      : !solves
        ? "Setters and admins cannot run or submit."
        : "Running code arrives in phase 4.";

   return (
      <div className="result">
         <div className="result-bar">
            <button type="button" className="btn btn-secondary" disabled>
               Run samples
            </button>

            <button
               type="button"
               className="btn btn-primary result-submit"
               disabled
            >
               Submit
            </button>

            <span className="result-gate">{gate}</span>
         </div>

         <div className="result-body">
            <p className="result-idle">
               Nothing run yet. <strong>Run samples</strong> checks the{" "}
               {sampleCount} examples on the left and keeps nothing.{" "}
               <strong>Submit</strong> runs all {testCount} tests, including
               hidden ones, and is saved to your history.
            </p>
         </div>
      </div>
   );
};

export default ResultPanel;
