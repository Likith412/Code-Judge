import "./index.css";

// A message about the whole form. "error" for failures, "note" for steps left.
const Notice = (props) => {
   const { tone = "error", children } = props;

   if (!children) return null;

   return <div className={`notice notice-${tone}`}>{children}</div>;
};

export default Notice;
