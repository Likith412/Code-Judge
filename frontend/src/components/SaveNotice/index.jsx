import Notice from "../Notice";
import { fieldName } from "../ProblemForm/draft";

import "./index.css";

// The result of a save, with each field the server turned down.
const SaveNotice = ({ message, errors }) => {
   if (!message) return null;

   const list = Object.entries(errors);

   return (
      <Notice tone={message.tone}>
         {message.text}
         {list.length > 0 && (
            <ul className="save-error-list">
               {list.map(([path, issue]) => (
                  <li key={path}>
                     {fieldName(path)}: {issue}
                  </li>
               ))}
            </ul>
         )}
      </Notice>
   );
};

export default SaveNotice;
