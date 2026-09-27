import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";

import UserContext from "../../context/UserContext";

// Wraps the pages that only make sense when nobody is signed in, so sign-in
// and register are only reachable after signing out.
const GuestRoutes = () => {
   const { user } = useContext(UserContext);

   if (user) return <Navigate to="/problems" replace />;

   return <Outlet />;
};

export default GuestRoutes;
