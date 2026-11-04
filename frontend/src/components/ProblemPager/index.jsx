import "./index.css";

// At most five numbers, with the current one in the middle where there is room.
function pagesToShow(page, totalPages) {
   const width = Math.min(5, totalPages);
   const first = Math.min(
      Math.max(1, page - Math.floor(width / 2)),
      totalPages - width + 1,
   );

   const pages = [];

   for (let number = first; number < first + width; number += 1) {
      pages.push(number);
   }

   return pages;
}

const ProblemPager = (props) => {
   const { page, limit, total, totalPages, onGo } = props;

   return (
      <div className="problems-pager">
         <span className="problems-pager-text">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of{" "}
            {total}
         </span>

         <div className="problems-pager-buttons">
            <button
               type="button"
               className="btn btn-secondary"
               onClick={() => onGo(page - 1)}
               disabled={page <= 1}
            >
               Previous
            </button>

            {pagesToShow(page, totalPages).map((number) => (
               <button
                  key={number}
                  type="button"
                  className={
                     number === page
                        ? "problems-page problems-page-on"
                        : "problems-page"
                  }
                  onClick={() => onGo(number)}
               >
                  {number}
               </button>
            ))}

            <button
               type="button"
               className="btn btn-secondary"
               onClick={() => onGo(page + 1)}
               disabled={page >= totalPages}
            >
               Next
            </button>
         </div>
      </div>
   );
};

export default ProblemPager;
