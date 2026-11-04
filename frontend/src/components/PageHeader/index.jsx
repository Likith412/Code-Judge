import "./index.css";

// A page title, a count line under it, and a rule under the whole row.
const PageHeader = ({ title, count, children }) => (
   <header className="page-header">
      <div>
         <h1 className="page-header-title">{title}</h1>
         {count && <div className="page-header-count">{count}</div>}
      </div>

      {children}
   </header>
);

export default PageHeader;
