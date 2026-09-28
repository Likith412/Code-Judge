import "./index.css";

// Displays a message for the whole form above it.
// Use "error" for failures and "note" for informational messages.
const Notice = (props) => {
   const { tone = "error", children } = props;

   if (!children) return null;

   return <div className={`notice notice-${tone}`}>{children}</div>;
};

export default Notice;
