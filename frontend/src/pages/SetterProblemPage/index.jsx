import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import EditProblemPage from "../EditProblemPage";
import TestCasesPage from "../TestCasesPage";

// One page, two tabs: ?tab=test-cases, or the editor when there is no tab.
const tabFrom = (value) => (value === "test-cases" ? "test-cases" : "editor");

const SetterProblemPage = () => {
   const { slug } = useParams();
   const [searchParams] = useSearchParams();
   const tab = tabFrom(searchParams.get("tab"));

   // A tab stays mounted once opened, so unsaved edits survive a switch.
   const [opened, setOpened] = useState({ slug, tabs: [tab] });

   // A different problem starts fresh. Adjusted in render, not an effect.
   if (opened.slug !== slug) {
      setOpened({ slug, tabs: [tab] });
   } else if (!opened.tabs.includes(tab)) {
      setOpened({ slug, tabs: [...opened.tabs, tab] });
   }

   const shows = (name) => opened.tabs.includes(name) || name === tab;

   return (
      <>
         {shows("editor") && (
            <div hidden={tab !== "editor"}>
               <EditProblemPage />
            </div>
         )}
         {shows("test-cases") && (
            <div hidden={tab !== "test-cases"}>
               <TestCasesPage />
            </div>
         )}
      </>
   );
};

export default SetterProblemPage;
