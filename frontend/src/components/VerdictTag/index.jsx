import { STATUS_LABEL, isPending, statusTone } from "../../utils/verdicts";

import "./index.css";

// Grey with a pulse while waiting, ink for accepted, red for the rest.
const VerdictTag = ({ status, children }) => (
   <span className={`verdict verdict-${statusTone(status)}`}>
      {isPending(status) && <span className="verdict-pulse" />}
      {children || STATUS_LABEL[status] || status}
   </span>
);

export default VerdictTag;
