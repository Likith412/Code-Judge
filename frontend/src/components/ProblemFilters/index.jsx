import FilterGroup from "../FilterGroup";

import "./index.css";

const difficultyFilters = [
   { value: "", label: "All" },
   { value: "EASY", label: "Easy" },
   { value: "MEDIUM", label: "Medium" },
   { value: "HARD", label: "Hard" },
];

const progressFilters = [
   { value: "", label: "All" },
   { value: "solved", label: "Solved" },
   { value: "unsolved", label: "Unsolved" },
   { value: "tried", label: "Tried" },
];

const visibilityFilters = [
   { value: "PUBLISHED", label: "Published" },
   { value: "DRAFT", label: "Drafts" },
   { value: "ALL", label: "Both" },
];

const chipClass = (parts) => parts.filter(Boolean).join(" ");

// Tags pick several at once; carrying any one of them is enough to show.
const ProblemFilters = (props) => {
   const {
      difficulty,
      progress,
      status,
      mine,
      tags,
      tagCounts,
      solves,
      canSeeDrafts,
      onPick,
      onToggleTag,
   } = props;

   return (
      <aside className="problems-rail">
         <FilterGroup
            label="Difficulty"
            options={difficultyFilters}
            value={difficulty}
            onPick={(value) => onPick({ difficulty: value })}
         />

         {solves && (
            <FilterGroup
               label="Progress"
               options={progressFilters}
               value={progress}
               onPick={(value) => onPick({ progress: value })}
            />
         )}

         {canSeeDrafts && (
            <FilterGroup
               label="Visibility"
               options={visibilityFilters}
               value={status}
               onPick={(value) => onPick({ status: value })}
            >
               <button
                  type="button"
                  className={chipClass([
                     "problems-chip",
                     "problems-mine",
                     mine === "true" && "problems-chip-on",
                  ])}
                  onClick={() =>
                     onPick({ mine: mine === "true" ? "" : "true" })
                  }
               >
                  Only mine
               </button>
            </FilterGroup>
         )}

         {tagCounts.length > 0 && (
            <FilterGroup label="Tags">
               <div className="problems-rail-tags">
                  {tagCounts.map((item) => (
                     <button
                        key={item.tag}
                        type="button"
                        className={chipClass([
                           "problems-chip",
                           tags.includes(item.tag) && "problems-chip-on",
                        ])}
                        onClick={() => onToggleTag(item.tag)}
                     >
                        {item.tag}
                        <span className="problems-chip-count">
                           {item.count}
                        </span>
                     </button>
                  ))}
               </div>
            </FilterGroup>
         )}
      </aside>
   );
};

export default ProblemFilters;
