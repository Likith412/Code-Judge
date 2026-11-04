import { Link } from "react-router-dom";

import "./index.css";

// Problem editor | Test cases as ?tab= on one url; a new problem has only the editor.
const SetterTabs = ({ slug, active }) => {
   const tabs = [
      {
         key: "editor",
         label: "Problem editor",
         to: `/setter/problems/${slug}/edit`,
      },
      {
         key: "cases",
         label: "Test cases",
         to: `/setter/problems/${slug}/edit?tab=test-cases`,
      },
   ].filter((tab) => slug || tab.key === "editor");

   return (
      <nav className="setter-tabs">
         {tabs.map((tab) =>
            tab.key === active ? (
               <span className="setter-tab setter-tab-on" key={tab.key}>
                  {tab.label}
               </span>
            ) : (
               <Link className="setter-tab" key={tab.key} to={tab.to}>
                  {tab.label}
               </Link>
            ),
         )}
      </nav>
   );
};

export default SetterTabs;
