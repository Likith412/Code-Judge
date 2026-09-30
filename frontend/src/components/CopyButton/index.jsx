import { useState } from "react";

import "./index.css";

// Says "Copied" for a moment. Hidden where the browser has no clipboard.
const CopyButton = (props) => {
   const { text, label = "Copy" } = props;

   const [copied, setCopied] = useState(false);

   if (!navigator.clipboard) return null;

   const onClickCopy = async () => {
      try {
         await navigator.clipboard.writeText(text);
         setCopied(true);
         setTimeout(() => setCopied(false), 1500);
      } catch {
         setCopied(false);
      }
   };

   return (
      <button type="button" className="copy-button" onClick={onClickCopy}>
         {copied ? "Copied" : label}
      </button>
   );
};

export default CopyButton;
