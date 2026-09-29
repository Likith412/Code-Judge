import { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import UserContext from "../../context/UserContext";

// Wraps the pages that only make sense when nobody is signed in.
const GuestRoutes = () => {
   const { user } = useContext(UserContext);
   const location = useLocation();

   // LoginPage navigates at the same moment, so both must pick the same place.
   if (user) return <Navigate to={location.state?.from || "/problems"} replace />;

   return <Outlet />;
};

export default GuestRoutes;
