import { useEffect, useState } from "react";

import "./App.css";

function App() {
   const [message, setMessage] = useState("");

   useEffect(() => {
      const getMessage = async () => {
         setMessage("Loading...");
         try {
            const response = await fetch("http://localhost:3000/");
            const data = await response.json();
            setMessage(data.message);
         } catch (error) {
            console.error("Error fetching message:", error);
            setMessage("Error fetching message");
         }
      };

      getMessage();
   }, []);

   return <div>{message}</div>;
}

export default App;
