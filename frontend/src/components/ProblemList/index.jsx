import { Link } from "react-router-dom";

import DifficultyTag from "../DifficultyTag";
import { CheckIcon } from "../Icons";

import "./index.css";

// Null until someone has submitted, which is every problem until phase 4.
const acceptRate = (rate) => (rate === null ? "—" : `${rate}%`);

const ProblemList = (props) => {
   const { problems } = props;

   return (
      <>
         <div className="problems-head">
            <span />
            <span>Title</span>
            <span>Difficulty</span>
            <span>Tags</span>
            <span className="problems-rate">Accept rate</span>
         </div>

         {problems.map((item) => (
            <Link
               className="problems-row"
               to={`/problems/${item.slug}`}
               key={item.id}
            >
               <span className="problems-tick">
                  {item.solved && <CheckIcon />}
               </span>

               <span className="problems-row-title">
                  <span className="problems-row-name">{item.title}</span>

                  {item.isPublished === false && (
                     <span className="problems-draft">Draft</span>
                  )}
               </span>

               <span>
                  <DifficultyTag difficulty={item.difficulty} />
               </span>

               <span className="problems-row-tags">{item.tags.join(", ")}</span>

               <span className="problems-rate">
                  {acceptRate(item.acceptanceRate)}
               </span>
            </Link>
         ))}
      </>
   );
};

export default ProblemList;
