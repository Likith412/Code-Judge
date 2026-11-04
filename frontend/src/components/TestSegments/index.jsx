import { isPending } from "../../utils/verdicts";

import "./index.css";

// One block per test: ink for passed, red for the failed one, grey for the rest.
const TestSegments = ({ submission, gap = "" }) => {
   const { totalTestCases, testCasesPassed, failedTestIndex, status } =
      submission;

   const pending = isPending(status);

   return (
      <div className={`result-segs ${gap}`}>
         {Array.from({ length: totalTestCases }, (_, index) => {
            const position = index + 1;
            let tone = "";

            if (!pending && position <= testCasesPassed)
               tone = "result-seg-pass";

            if (!pending && position === failedTestIndex)
               tone = "result-seg-fail";

            return <span key={position} className={`result-seg ${tone}`} />;
         })}
      </div>
   );
};

export default TestSegments;
