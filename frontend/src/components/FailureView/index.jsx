import "./index.css";

const FailureView = (props) => {
   const { message, onRetry } = props;

   return (
      <main className="cj-main-narrow">
         <h1 className="cj-screen-title">Something went wrong</h1>

         <p className="failure-view-message">{message}</p>

         <button type="button" className="btn btn-primary" onClick={onRetry}>
            Try again
         </button>
      </main>
   );
};

export default FailureView;
