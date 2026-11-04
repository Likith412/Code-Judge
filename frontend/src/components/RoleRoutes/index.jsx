import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";

import UserContext from "../../context/UserContext";
import { homePath } from "../../utils/home";

// Wraps the setter and admin areas: <RoleRoutes allow={["SETTER", "ADMIN"]} />.
const RoleRoutes = ({ allow }) => {
   const { user } = useContext(UserContext);

   if (!user) return <Navigate to="/login" replace />;

   if (!allow.includes(user.role))
      return <Navigate to={homePath(user)} replace />;

   return <Outlet />;
};

export default RoleRoutes;
