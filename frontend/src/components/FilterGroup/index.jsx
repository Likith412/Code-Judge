import "./index.css";

// A labelled set of one-at-a-time buttons. Anything else goes in as children.
const FilterGroup = (props) => {
   const { label, options, value, onPick, children } = props;

   return (
      <div>
         <div className="filter-group-label">{label}</div>

         {options && (
            <div className="filter-group-list">
               {options.map((option) => (
                  <button
                     key={option.value}
                     type="button"
                     className={
                        option.value === value
                           ? "filter-group-button filter-group-button-on"
                           : "filter-group-button"
                     }
                     onClick={() => onPick(option.value)}
                  >
                     {option.label}
                  </button>
               ))}
            </div>
         )}

         {children}
      </div>
   );
};

export default FilterGroup;
