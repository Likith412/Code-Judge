import { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import UserContext from "../../context/UserContext";

// Wraps the pages that only make sense when nobody is signed in, so sign-in
// and register are only reachable after signing out.
const GuestRoutes = () => {
   const { user } = useContext(UserContext);
   const location = useLocation();

   // Signing in sets the user and navigates in the same moment, so this guard
   // and LoginPage both fire. They have to agree on the destination, or which
   // one lands first decides whether `from` is honoured.
   if (user) return <Navigate to={location.state?.from || "/problems"} replace />;

   return <Outlet />;
};

export default GuestRoutes;
