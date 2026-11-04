import "./index.css";

// A list that would not load: what failed, why, and a way to try again.
const LoadFailed = ({ title, message, onRetry }) => (
   <div className="load-failed">
      <div className="load-failed-title">{title}</div>
      <p className="load-failed-message">{message}</p>
      <button type="button" className="btn btn-secondary" onClick={onRetry}>
         Try again
      </button>
   </div>
);

export default LoadFailed;
