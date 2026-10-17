import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import EditProblemPage from "../EditProblemPage";
import TestCasesPage from "../TestCasesPage";

// One page, two tabs: ?tab=test-cases, or the editor when there is no tab.
const tabFrom = (value) => (value === "test-cases" ? "test-cases" : "editor");

const SetterProblemPage = () => {
   const [searchParams] = useSearchParams();
   const tab = tabFrom(searchParams.get("tab"));

   // A tab stays mounted once opened, so unsaved edits survive.
   const [opened, setOpened] = useState([tab]);

   // Adjusted in render, not an effect.
   if (!opened.includes(tab)) setOpened([...opened, tab]);

   const shows = (name) => opened.includes(name) || name === tab;

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
