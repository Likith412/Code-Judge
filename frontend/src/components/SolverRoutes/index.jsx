import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";

import UserContext from "../../context/UserContext";
import { homePath } from "../../utils/home";

// Pages for people who solve: visitors and USERs. Setters and admins go home.
const SolverRoutes = () => {
   const { user } = useContext(UserContext);

   if (user && user.role !== "USER") {
      return <Navigate to={homePath(user)} replace />;
   }

   return <Outlet />;
};

export default SolverRoutes;
