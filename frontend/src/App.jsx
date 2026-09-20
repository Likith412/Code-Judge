import { useEffect, useState } from "react";

import client from "./api/client";
import "./App.css";

function App() {
   const [health, setHealth] = useState(null);
   const [error, setError] = useState(null);

   useEffect(() => {
      client
         .get("/health")
         .then((response) => setHealth(response.data))
         .catch((err) => setError(err.message));
   }, []);

   return (
      <main className="page">
         <div className="card">
            <h1>Code Judge</h1>

            {error && <p className="status error">{error}</p>}
            {health && (
               <p className={health.ok ? "status up" : "status down"}>
                  ok: {String(health.ok)} · db: {health.db}
               </p>
            )}
            {!error && !health && <p className="status">checking…</p>}
         </div>
      </main>
   );
}

export default App;
