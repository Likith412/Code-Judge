import "./index.css";

// EASY, MEDIUM, HARD. One class per level so each gets its own colour.
const DifficultyTag = (props) => {
   const { difficulty } = props;

   if (!difficulty) return null;

   const label = difficulty.charAt(0) + difficulty.slice(1).toLowerCase();

   return (
      <span className={`difficulty difficulty-${difficulty.toLowerCase()}`}>
         {label}
      </span>
   );
};

export default DifficultyTag;
