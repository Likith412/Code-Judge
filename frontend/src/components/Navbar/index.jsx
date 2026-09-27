import { useContext } from "react";
import { Link, NavLink } from "react-router-dom";

import UserContext from "../../context/UserContext";

import "./index.css";

const SETTER_ROLES = ["SETTER", "ADMIN"];

const linkClass = ({ isActive }) =>
   isActive ? "cj-nav-link cj-nav-link-active" : "cj-nav-link";

const RestoringSession = () => (
   <>
      <span className="cj-skeleton cj-skeleton-name" />
      <span className="cj-skeleton cj-skeleton-avatar" />
   </>
);

const Navbar = (props) => {
   const { restoring } = props;

   const { user, signOut } = useContext(UserContext);

   const isSetter = Boolean(user) && SETTER_ROLES.includes(user.role);
   const isAdmin = user?.role === "ADMIN";

   return (
      <nav className="cj-nav">
         <Link to="/problems" className="cj-brand">
            <span className="cj-brand-mark" />
            Code Judge
         </Link>

         <NavLink to="/problems" className={linkClass}>
            Problems
         </NavLink>

         {user && (
            <NavLink to="/submissions" className={linkClass}>
               Submissions
            </NavLink>
         )}

         {isSetter && (
            <NavLink to="/setter/problems" className={linkClass}>
               Setter
            </NavLink>
         )}

         {isAdmin && (
            <NavLink to="/admin" className={linkClass}>
               Admin
            </NavLink>
         )}

         <div className="cj-nav-end">
            {restoring && <RestoringSession />}

            {!restoring && !user && (
               <>
                  <NavLink to="/login" className={linkClass}>
                     Sign in
                  </NavLink>
                  <Link to="/register" className="btn btn-primary cj-register">
                     Register
                  </Link>
               </>
            )}

            {!restoring && user && (
               <>
                  <Link to={`/u/${user.username}`} className="cj-me">
                     <span className="cj-avatar">
                        {user.username.charAt(0).toUpperCase()}
                     </span>
                     <span className="cj-me-name">{user.username}</span>
                  </Link>

                  <NavLink to="/settings" className={linkClass}>
                     Settings
                  </NavLink>

                  <button
                     type="button"
                     className="btn btn-ghost"
                     onClick={signOut}
                  >
                     Sign out
                  </button>
               </>
            )}
         </div>
      </nav>
   );
};

export default Navbar;
