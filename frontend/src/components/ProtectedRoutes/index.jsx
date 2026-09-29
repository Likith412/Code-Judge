import { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import UserContext from "../../context/UserContext";

// Wraps the pages that need a signed-in user. Everyone else goes to sign-in.
const ProtectedRoutes = () => {
   const { user } = useContext(UserContext);
   const location = useLocation();

   if (!user) {
      // Remembered so sign-in can send them back where
      return (
         <Navigate to="/login" replace state={{ from: location.pathname }} />
      );
   }

   return <Outlet />;
};

export default ProtectedRoutes;
