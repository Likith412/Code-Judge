import { Link } from "react-router-dom";

// Not guarded: an unknown address is a 404 whoever is looking.
const NotFoundPage = () => (
   <main className="cj-main-narrow">
      <h1 className="cj-screen-title">No page at this address</h1>

      <p className="cj-muted">
         The link may be out of date, or the address may have a typo in it.
      </p>

      <Link to="/problems" className="btn btn-primary">
         Go to problems
      </Link>
   </main>
);

export default NotFoundPage;
